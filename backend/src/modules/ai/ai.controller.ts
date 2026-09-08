import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Errors } from '../../utils/errors'

// M20 - IA/Assistente
// MVP: briefings gerados a partir dos dados da plataforma (template/data-driven).
// Com OPENAI_API_KEY configurada, o prompt é enviado à API para geração real.

type BriefingScope =
  | { type: 'platform' }
  | { type: 'asset'; ticker: string }
  | { type: 'client'; clientId: string }
  | { type: 'sector'; sector: string }
  | { type: 'news' }

function fmt(n: number | null | undefined, digits = 2) {
  if (n == null) return '—'
  return n.toFixed(digits)
}

function fmtCompact(n: bigint | number | null | undefined) {
  if (n == null) return '—'
  const v = Number(n)
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toFixed(2)
}

async function generateBriefing(scope: BriefingScope): Promise<{ sections: string[]; data: any }> {
  switch (scope.type) {
    case 'platform': {
      const now = new Date()
      const [activeClients, atRisk, churned, openTasks, weekEvents] = await Promise.all([
        prisma.client.count({ where: { status: 'ACTIVE' } }),
        prisma.client.count({ where: { status: 'AT_RISK' } }),
        prisma.client.count({ where: { status: 'CHURNED' } }),
        prisma.task.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.economicEvent.findMany({
          where: { date: { gte: now }, actual: null },
          orderBy: { date: 'asc' },
          take: 5,
        }),
      ])

      const [gainers, losers] = await Promise.all([
        prisma.quote.findMany({
          where: { asset: { type: 'STOCK' } },
          orderBy: { changePct1D: 'desc' },
          take: 5,
          include: { asset: { select: { ticker: true, name: true } } },
        }),
        prisma.quote.findMany({
          where: { asset: { type: 'STOCK' } },
          orderBy: { changePct1D: 'asc' },
          take: 5,
          include: { asset: { select: { ticker: true, name: true } } },
        }),
      ])

      const escalated = await prisma.client.findMany({
        where: { churnRisk: { gte: 70 } },
        orderBy: { churnRisk: 'desc' },
        take: 3,
        select: { id: true, name: true, churnRisk: true, status: true },
      })

      const data = { activeClients, atRisk, churned, openTasks, weekEvents, gainers, losers, escalated }
      const sections = [
        `## Visão Geral\n- Clientes ativos: ${activeClients} · Em risco: ${atRisk} · Perdidos: ${churned}.\n- Tarefas em aberto: ${openTasks}.`,
        `## Destaques do Mercado\nGanhos do dia: ${gainers.map((g) => `${g.asset.ticker} (${fmt(g.changePct1D)}%)`).join(', ')}.\nPerdas: ${losers.map((l) => `${l.asset.ticker} (${fmt(l.changePct1D)}%)`).join(', ')}.`,
        `## Sinais de Retenção\nClientes com risco elevado para priorizar: ${escalated.map((c) => `- ${c.name} (churn ${c.churnRisk}%)`).join('\n') || 'nenhum no momento'}.`,
        `## Próximos Eventos\n${weekEvents.map((e) => `- ${e.date.toISOString().slice(0, 10)}: ${e.country} ${e.indicator} (${e.impact})`).join('\n') || 'Nenhum evento econômico nos próximos 7 dias.'}`,
        `## Recomendações\nRetenção: acione clientes ${atRisk > 0 ? 'em risco antes do fim da semana' : 'com histórico de inatividade'} e conclua as tarefas em aberto.`,
      ]
      return { sections, data }
    }

    case 'asset': {
      const asset = await prisma.asset.findFirst({
        where: { ticker: scope.ticker.toUpperCase() },
        include: {
          quotes: { orderBy: { updatedAt: 'desc' }, take: 1 },
          fundamentals: { orderBy: { updatedAt: 'desc' }, take: 1 },
          earnings: { orderBy: { reportDate: 'desc' }, take: 4 },
          newsLinks: {
            orderBy: { news: { publishedAt: 'desc' } },
            take: 4,
            include: { news: { select: { title: true, publishedAt: true, sentiment: true } } },
          },
        },
      })
      if (!asset) throw Errors.notFound('Ativo não encontrado')
      const data = { asset }
      const q = asset.quotes[0]
      const f = asset.fundamentals[0]

      const sections = [
        `## Visão Geral\n${asset.name} (${asset.ticker}) · ${asset.exchange ?? '—'} · ${asset.type}.\nÚltima cotação: ${asset.currency} ${fmt(q?.price)} (${fmt(q?.changePct1D)}% em 1D).`,
        `## Fundamentos\n${
          f
            ? `Mkt Cap: ${fmtCompact(f.marketCap)} · P/L: ${fmt(f.peRatio, 1)} · Div Yield: ${fmt(f.dividendYield, 2)}%\nPreço/Vendas: ${fmt(f.psRatio, 1)} · Preço/Valor: ${fmt(f.pbRatio, 1)} · EV/EBITDA: ${fmt(f.evEbitda, 1)}`
            : 'Fundamentos não disponíveis.'}`,
        `## Notícias Recentes\n${asset.newsLinks.map((n) => `- ${n.news.title}`).join('\n') || 'Sem notícias vinculadas.'}`,
        `## Análise Fundamental\n${analyzeFundamentals({ peRatio: f?.peRatio, dividendYield: f?.dividendYield, marketCap: f?.marketCap, roe: f?.roe, roa: f?.roa })}`,
        `## Recomendação\n${generateRecommendation({ peRatio: f?.peRatio, dividendYield: f?.dividendYield, marketCap: f?.marketCap, roe: f?.roe })}`,
      ]
      return { sections, data }
    }

    case 'client': {
      const client = await prisma.client.findUnique({
        where: { id: scope.clientId },
        include: {
          owner: { select: { name: true } },
          interests: true,
          watchlists: { include: { assets: { include: { asset: { select: { ticker: true, name: true } } } } } },
          financialEvents: { orderBy: { date: 'desc' }, take: 10 },
          tasks: { orderBy: { dueAt: 'asc' } },
          scores: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      })
      if (!client) throw Errors.notFound('Cliente não encontrado')
      const data = { client }
      const lastScore = client.scores[0]
      const watchlistAssets = client.watchlists.flatMap((w) => w.assets.map((a) => a.asset.ticker))
      const totalDeposits = client.financialEvents
        .filter((e) => ['INITIAL_DEPOSIT', 'REPEAT_DEPOSIT', 'FTD'].includes(e.type))
        .reduce((a, e) => a + e.amount, 0)

      const sections = [
        `## Perfil\n${client.name} · ${client.country ?? '—'} · Desde ${new Date(client.createdAt).toLocaleDateString('pt-BR')}.\nStatus: ${client.status} · Churn risk: ${client.churnRisk}%`,
        `## Interesses e Investimentos\nInteresses: ${client.interests.map((i) => i.interest).join(', ') || 'nenhum'}. Watchlist: ${watchlistAssets.join(', ') || 'nenhuma'}.`,
        `## Status de Retenção\nScore: ${lastScore?.score ?? '—'} · Último contato: ${client.lastContactAt ? new Date(client.lastContactAt).toLocaleDateString('pt-BR') : 'nunca'}`,
        `## Atividades Recentes\n${client.financialEvents.map((e) => `- ${e.date.toISOString().slice(0, 10)} ${e.type}: ${fmt(e.amount)} ${e.currency}`).join('\n') || 'Sem movimentações'}\nDepósitos totais: ${fmt(totalDeposits)} USD`,
        `## Ações Recomendadas\n${generateClientActions(client)}`,
      ]
      return { sections, data }
    }

    case 'sector': {
      const assets = await prisma.asset.findMany({
        where: { sector: scope.sector, type: 'STOCK' },
        include: { quotes: { orderBy: { updatedAt: 'desc' }, take: 1 } },
      })
      if (assets.length === 0) throw Errors.notFound('Setor não encontrado')
      const avgChange = assets.reduce((a, x) => a + (x.quotes[0]?.changePct1D ?? 0), 0) / (assets.length || 1)
      const data = { assets }
      const sections = [
        `## Visão Geral\nSetor: ${scope.sector} · ${assets.length} ativos · Variação média ${fmt(avgChange, 2)}%.`,
        `## Destaques\n${assets.map((a) => `- ${a.ticker} ${a.name}: ${fmt(a.quotes[0]?.changePct1D)}%`).join('\n')}`,
        `## Recomendações\nObserve os ativos com momentum positivo e avalie cautela nos com variação negativa relevante.`,
      ]
      return { sections, data }
    }

    case 'news': {
      const articles = await prisma.newsArticle.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 12,
      })
      const data = { articles }
      const symbols = await prisma.newsAssetLink.findMany({
        where: { newsId: { in: articles.map((a) => a.id) } },
        include: { asset: { select: { ticker: true } } },
      })
      const mentioned = [...new Set(symbols.map((s) => s.asset.ticker))].join(', ')
      const sections = [
        `## Manchetes\n${articles.map((n) => `- ${n.title}`).join('\n') || 'Sem notícias.'}`,
        `## Impacto no Mercado\nAtivos citados: ${mentioned || '—'} · Setores em destaque: ${[...new Set(articles.map((a) => a.sector).filter(Boolean))].slice(0, 5).join(', ') || '—'}`,
        `## Principais Temas\nResumo consolidado das ${articles.length} notícias mais recentes por relevância.`,
      ]
      return { sections, data }
    }
  }
}

function analyzeFundamentals(f: {
  peRatio?: number | null
  dividendYield?: number | null
  marketCap?: bigint | null
  roe?: number | null
  roa?: number | null
}) {
  if (f.peRatio == null && f.dividendYield == null && f.marketCap == null && f.roe == null) {
    return 'Dados fundamentais indisponíveis.'
  }
  const parts: string[] = []
  if (f.peRatio && f.peRatio > 0 && f.peRatio < 15) parts.push('múltiplo P/L atrativo.')
  if (f.dividendYield && f.dividendYield > 4) parts.push('bom retorno de dividendos.')
  if (f.roe && f.roe > 20) parts.push('alta rentabilidade sobre patrimônio (ROE).')
  if (f.roa && f.roa > 10) parts.push('bom retorno sobre ativos (ROA).')
  return parts.join('\n') || 'Múltiplos em linha com o mercado.'
}

function generateRecommendation(f: {
  peRatio?: number | null
  dividendYield?: number | null
  marketCap?: bigint | null
  roe?: number | null
}) {
  if (f.peRatio == null && f.dividendYield == null && f.marketCap == null && f.roe == null) {
    return 'Recomendação: sem fundamentos suficientes, mantenha observação.'
  }
  let score = 50
  if (f.peRatio && f.peRatio > 0 && f.peRatio < 15) score += 10
  if (f.peRatio && f.peRatio > 30) score -= 10
  if (f.dividendYield && f.dividendYield > 4) score += 10
  if (f.marketCap && Number(f.marketCap) > 1e10) score += 5
  if (f.roe && f.roe > 20) score += 10
  if (score >= 65) return `Sinal de compra moderado (score ${score}/100).`
  if (score >= 45) return `Manter em carteira; aguardar melhor ponto de entrada (score ${score}/100).`
  return `Sinal defensivo/cauteloso (score ${score}/100).`
}

function generateClientActions(client: any) {
  const actions: string[] = []
  if (client.status === 'AT_RISK' || client.churnRisk >= 70) {
    actions.push('Priorizar contato: cliente em risco de perda.')
  }
  if (client.tasks && client.tasks.some((t: any) => (t.status === 'OPEN' || t.status === 'IN_PROGRESS') && t.dueAt)) {
    actions.push('Concluir tarefas em aberto com prazo.')
  }
  if (client.interests && client.interests.length === 0) {
    actions.push('Atualizar interesses de investimento do cliente.')
  }
  if (actions.length === 0) actions.push('Manter frequência de contato semanal.')
  return actions.map((a) => `- ${a}`).join('\n')
}

// Converte BigInt (não serializável em JSON) e Date para formatos seguros
function sanitizeForJson(v: any): any {
  if (v == null) return v
  if (typeof v === 'bigint') return v.toString()
  if (v instanceof Date) return v.toISOString()
  if (Array.isArray(v)) return v.map(sanitizeForJson)
  if (typeof v === 'object') {
    const out: Record<string, any> = {}
    for (const [k, val] of Object.entries(v)) out[k] = sanitizeForJson(val)
    return out
  }
  return v
}

export async function getBriefing(req: Request, res: Response, next: NextFunction) {
  try {
    const { scope = 'platform', id } = req.query as any

    let briefingScope: BriefingScope
    switch (scope) {
      case 'asset': {
        if (!id) throw Errors.badRequest('Parâmetro id (ticker) é obrigatório para scope=asset')
        briefingScope = { type: 'asset', ticker: String(id) }
        break
      }
      case 'client': {
        if (!id) throw Errors.badRequest('Parâmetro id (clientId) é obrigatório para scope=client')
        briefingScope = { type: 'client', clientId: String(id) }
        break
      }
      case 'sector': {
        if (!id) throw Errors.badRequest('Parâmetro id (sector) é obrigatório para scope=sector')
        briefingScope = { type: 'sector', sector: String(id) }
        break
      }
      case 'news':
        briefingScope = { type: 'news' }
        break
      default:
        briefingScope = { type: 'platform' }
    }

    const { sections, data } = await generateBriefing(briefingScope)

    const prompt = sections.join('\n\n')

    // Se houver chave de IA, envia prompt à API
    const apiKey = process.env.OPENAI_API_KEY
    let aiOutput: string | null = null
    let latencyMs: number | null = null
    if (apiKey) {
      const start = Date.now()
      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: prompt },
              { role: 'user', content: 'Gere o briefing agora.' },
            ],
            temperature: 0.4,
          }),
        })
        const json: any = await resp.json()
        aiOutput = json?.choices?.[0]?.message?.content ?? null
        latencyMs = Date.now() - start
      } catch {
        aiOutput = null
      }
    }

    const record = await prisma.aiRequest.create({
      data: {
        userId: req.user!.id,
        type: `briefing:${briefingScope.type}`,
        question: `Briefing ${briefingScope.type}`,
        input: sanitizeForJson({ data }),
        output: aiOutput ? sanitizeForJson({ text: aiOutput, sections: aiOutput ? [aiOutput] : sections }) : sanitizeForJson({ sections }),
        model: apiKey ? process.env.OPENAI_MODEL || 'gpt-4o-mini' : 'template',
        latencyMs,
      },
    })

    res.json({
      briefing: {
        id: record.id,
        scope: briefingScope.type,
        generatedAt: record.createdAt,
        sections: aiOutput ? [aiOutput] : sections,
        ai: !!aiOutput,
      },
      data: sanitizeForJson(data),
    })
  } catch (err) {
    next(err)
  }
}

export async function listRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '100' } = req.query as any
    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 100))
    const [total, requests] = await Promise.all([
      prisma.aiRequest.count(),
      prisma.aiRequest.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ])
    res.json({ requests, total })
  } catch (err) {
    next(err)
  }
}