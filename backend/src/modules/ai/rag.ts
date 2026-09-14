import { prisma } from '../../config/prisma'
import { embedText, embeddingEnabled, embeddingLastError, embeddingProvider, vectorLiteral } from './embeddings'

// RAG - Base de conhecimento da plataforma.
// Indexa documentos (docs/ajuda + conteúdo de investimento) em chunks com
// embedding vetorial (pgvector no Neon). Na consulta, busca os top-k chunks
// por similaridade e devolve como contexto (com fonte) para o callLLM.

const CHUNK_SIZE = 1200
const CHUNK_OVERLAP = 160

export interface RagSource {
  docId: string
  title: string
  category: string
  chunkIndex: number
  content: string
  score: number
}

export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return []
  if (clean.length <= size) return [clean]

  const chunks: string[] = []
  let start = 0
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length)
    if (end < clean.length) {
      const untilSpace = clean.lastIndexOf(' ', end)
      if (untilSpace > start + size * 0.5) end = untilSpace
    }
    chunks.push(clean.slice(start, end).trim())
    start = Math.max(end - overlap, start + 1)
  }
  return chunks.filter(Boolean)
}

// Insere somente o vetor (Prisma não conhece a coluna vector como escrevível).
async function setEmbedding(chunkId: string, embedding: number[] | null) {
  if (!embedding) return
  const lit = vectorLiteral(embedding)
  await prisma.$executeRawUnsafe(
    `UPDATE "KnowledgeChunk" SET embedding = '${lit}'::vector WHERE id = $1`,
    chunkId
  )
}

// Indexa um documento: cria o doc, divide em chunks e gera embeddings.
export async function indexDocument(input: {
  title: string
  content: string
  category?: string
  source?: string
}) {
  const title = String(input.title || '').trim()
  const content = String(input.content || '').trim()
  if (!title || !content) {
    throw new Error('title e content são obrigatórios')
  }
  const category = input.category || 'PLATFORM'

  const doc = await prisma.knowledgeDoc.create({
    data: { title, content, category, source: input.source || null, status: 'READY' },
  })

  const chunks = chunkText(content)
  const embedded = embeddingEnabled()
  let embeddedChunks = 0

  let chunkCount = 0
  for (let i = 0; i < chunks.length; i += 1) {
    const c = chunks[i]
    let emb: number[] | null = null
    if (embedded) {
      // tenta gerar embedding, com retry simples se a cota falhar
      for (let attempt = 0; attempt < 4 && !emb; attempt += 1) {
        emb = await embedText(c)
      }
    }

  const chunk = await prisma.knowledgeChunk.create({
      data: { docId: doc.id, chunkIndex: i, content: c },
    })
    await setEmbedding(chunk.id, emb && emb.length ? emb : null)
    chunkCount += 1
    embeddedChunks += emb && emb.length ? 1 : 0
  }

  await prisma.knowledgeDoc.update({ where: { id: doc.id }, data: { chunkCount } })
  return { doc, chunks: chunkCount, embedded, embeddedChunks }
}

// Busca por similaridade (ou keyword se não houver embeddings).
export async function retrieveContext(query: string, k = 4): Promise<RagSource[]> {
  const q = String(query || '').trim()
  if (!q) return []

  const emb = await embedText(q)

  if (emb && emb.length) {
    const lit = vectorLiteral(emb)
    const rows: any[] = await prisma.$queryRawUnsafe(
      `
      SELECT c."docId", d.title, d.category, c."chunkIndex", c.content,
             (1 - (c.embedding <=> '${lit}'::vector)) AS score
      FROM "KnowledgeChunk" c
      JOIN "KnowledgeDoc" d ON d.id = c."docId"
      WHERE c.embedding IS NOT NULL
      ORDER BY c.embedding <=> '${lit}'::vector ASC
      LIMIT $1
      `,
      k
    )
    return rows
      .filter((r) => r.content)
      .map((r) => ({
        docId: r.docId,
        title: r.title,
        category: r.category,
        chunkIndex: r.chunkIndex,
        content: r.content,
        score: Number(r.score),
      }))
  }

  // Fallback keyword: busca por termos nas palavras do query (qualquer termo,
  // ordenado por quantidade de correspondências).
  const terms = q
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 6)
  if (terms.length === 0) return []

  const likeClauses = terms.map((_, i) => `c.content ILIKE '%' || $${i + 2} || '%'`).join(' OR ')
  const matches: any[] = await prisma.$queryRawUnsafe(
    `
    SELECT c."docId", d.title, d.category, c."chunkIndex", c.content,
           (${terms.map((_, i) => `(c.content ILIKE '%' || $${i + 2} || '%')::int`).join(' + ')}) AS score
    FROM "KnowledgeChunk" c
    JOIN "KnowledgeDoc" d ON d.id = c."docId"
    WHERE ${likeClauses}
    ORDER BY score DESC
    LIMIT $1
    `,
    k,
    ...terms.map((t) => `%${t}%`)
  )
  return matches
    .filter((r) => r.content)
    .map((r) => ({
      docId: r.docId,
      title: r.title,
      category: r.category,
      chunkIndex: r.chunkIndex,
      content: r.content,
      score: Number(r.score),
    }))
}

export async function listKnowledgeDocs() {
  const docs = await prisma.knowledgeDoc.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      category: true,
      source: true,
      status: true,
      chunkCount: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return docs
}

export async function deleteKnowledgeDoc(id: string) {
  const doc = await prisma.knowledgeDoc.findUnique({ where: { id } })
  if (!doc) throw new Error('Documento não encontrado')
  await prisma.knowledgeChunk.deleteMany({ where: { docId: id } })
  await prisma.knowledgeDoc.delete({ where: { id } })
  return { deleted: true, id }
}

// Indexa as notícias mais recentes da plataforma como conteúdo de investimento.
export async function indexRecentNews(limit = 20): Promise<{ indexed: number; skipped: number }> {
  const articles = await prisma.newsArticle.findMany({
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })

  let indexed = 0
  let skipped = 0
  for (const a of articles) {
    const exists = await prisma.knowledgeDoc.findFirst({
      where: { title: a.title, category: 'NEWS' },
    })
    if (exists) {
      skipped += 1
      continue
    }
    const content = `${a.excerpt || a.title}\n${a.sector ? `Setor: ${a.sector}` : ''}${
      a.source ? `\nFonte: ${a.source}` : ''
    }${a.url ? `\nLink: ${a.url}` : ''}`.trim()
    await indexDocument({ title: a.title, content, category: 'NEWS', source: a.source || undefined })
    indexed += 1
  }
  return { indexed, skipped }
}

// Indexa um snapshot real do mercado (ativos + últimos quotes + fundamentos)
// como documentos da categoria 'MARKET'. Reindexa tudo (apaga os anteriores
// da mesma fonte para evitar duplicação quando os preços mudam).
export async function indexMarketSnapshot(): Promise<{ indexed: number; deleted: number }> {
  const assets = await prisma.asset.findMany({
    where: { status: 'ACTIVE' },
    include: {
      quotes: { orderBy: { updatedAt: 'desc' }, take: 1 },
      fundamentals: { orderBy: { updatedAt: 'desc' }, take: 1 },
    },
  })

  const deleted = await prisma.knowledgeDoc.deleteMany({ where: { category: 'MARKET', source: 'market-snapshot' } })

  const TYPE_LABEL: Record<string, string> = {
    STOCK: 'Ação',
    CRYPTO: 'Criptomoeda',
    FOREX: 'Par de moedas',
    ETF: 'ETF',
    INDEX: 'Índice',
    COMMODITY: 'Commodity',
  }

  const fmtBig = (v: bigint | null | undefined): string => {
    if (v == null) return '—'
    const n = Number(v)
    if (n >= 1e12) return `US$ ${(n / 1e12).toFixed(2)} tri`
    if (n >= 1e9) return `US$ ${(n / 1e9).toFixed(2)} bi`
    if (n >= 1e6) return `US$ ${(n / 1e6).toFixed(2)} mi`
    return `US$ ${n.toLocaleString('en-US')}`
  }

  const named = (q: any) => {
    if (q?.changePct1D == null) return '—'
    const dir = q.changePct1D >= 0 ? '+' : ''
    return `${dir}${q.changePct1D.toFixed(2)}%`
  }

  let indexed = 0
  for (const a of assets) {
    const q = a.quotes[0]
    const f = a.fundamentals[0]

    const title = `${a.ticker} — ${a.name}`
    const content = [
      `${a.ticker} (${a.name}) é ${(TYPE_LABEL[a.type] || a.type).toLowerCase()} listada em ${a.exchange || 'N/A'} (${a.market || a.country || 'N/A'}).`,
      `Última cotação: ${q?.price != null ? `${a.currency || 'USD'} ${Number(q.price).toLocaleString('en-US')} (${named(q)})` : 'sem cotação atual'}.`,
      f
        ? `Fundamentos: Market Cap ${fmtBig(f.marketCap)} · P/L ${f.peRatio != null ? f.peRatio.toFixed(2) : '—'} · Dividend Yield ${f.dividendYield != null ? `${f.dividendYield.toFixed(2)}%` : '—'} · ROE ${f.roe != null ? `${f.roe.toFixed(1)}%` : '—'} · EV/EBITDA ${f.evEbitda != null ? f.evEbitda.toFixed(2) : '—'}`
        : 'Fundamentos: não disponíveis.',
      a.sector ? `Setor: ${a.sector}${a.industry ? ` · Indústria: ${a.industry}` : ''}.` : '',
      `Variação: 1D ${named(q)} · 5D ${q?.changePct5D != null ? named({ changePct1D: q.changePct5D }) : '—'} · 30D ${q?.changePct30D != null ? named({ changePct1D: q.changePct30D }) : '—'}.`,
    ]
      .filter(Boolean)
      .join('\n')

    await indexDocument({ title, content, category: 'MARKET', source: 'market-snapshot' })
    indexed += 1
  }

  return { indexed, deleted: deleted.count }
}

export function ragStatus() {
  return {
    enabled: embeddingEnabled(),
    provider: embeddingProvider(),
    lastError: embeddingLastError(),
    docs: 0,
    chunks: 0,
    embeddedChunks: 0,
  }
}

export async function ragStatusDetailed() {
  const [docs, chunks, embedded] = await Promise.all([
    prisma.knowledgeDoc.count(),
    prisma.knowledgeChunk.count(),
    prisma.$queryRawUnsafe<{ c: bigint }[]>(
      `SELECT count(*) AS c FROM "KnowledgeChunk" WHERE embedding IS NOT NULL`
    ),
  ])
  return {
    enabled: embeddingEnabled(),
    provider: embeddingProvider(),
    lastError: embeddingLastError(),
    docs: Number(docs),
    chunks: Number(chunks),
    embeddedChunks: Number(embedded[0]?.c ?? 0),
  }
}