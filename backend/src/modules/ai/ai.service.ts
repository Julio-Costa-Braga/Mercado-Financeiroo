import { prisma } from '../../config/prisma'
import { ONBOARDING_QUESTIONS, OnboardingAnswer, RISK_PROFILE_LABELS, CLIENT_TYPE_LABELS } from './questions'

// M20/M21 - IA/Assistente
// Camada de servico: dados -> templates markdown (data-driven),
// com integracao opcional a OpenAI quando OPENAI_API_KEY estiver configurada.

export type RiskProfileResult = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'
export type ClientTypeResult = 'BEGINNER' | 'ENTHUSIAST' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL'

// ---------- helpers de formatacao ----------

export function fmt(n: number | null | undefined, digits = 2) {
  if (n == null) return '—'
  return n.toFixed(digits)
}

export function fmtCompact(n: bigint | number | null | undefined) {
  if (n == null) return '—'
  const v = Number(n)
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toFixed(2)
}

// ---------- OpenAI opcional ----------

export async function callOpenAI(prompt: string): Promise<{ output: string; latencyMs: number } | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const start = Date.now()
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Gere a resposta agora, em portugues, concisa e acao-clara.' },
        ],
        temperature: 0.4,
      }),
    })
    const json: any = await resp.json()
    const output = json?.choices?.[0]?.message?.content
    return output ? { output, latencyMs: Date.now() - start } : null
  } catch {
    return null
  }
}

export async function registerAiRequest(params: {
  userId: string
  type: string
  question?: string
  input?: any
  output?: any
  model?: string
  latencyMs?: number | null
}) {
  return prisma.aiRequest.create({
    data: {
      userId: params.userId,
      type: params.type,
      question: params.question,
      input: params.input ? sanitizeForJson(params.input) : undefined,
      output: params.output ? sanitizeForJson(params.output) : undefined,
      model: params.model || 'template',
      latencyMs: params.latencyMs ?? null,
    },
  })
}

// Converte BigInt/Date para formas serializaveis em JSON
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

// ---------- analise fundamental (compartilhada com briefing de ativo) ----------

export function analyzeFundamentals(f: {
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

export function generateRecommendation(f: {
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

// Score numerico 0..100 reutilizavel para ranking de dicas
export function fundamentalScore(f: {
  peRatio?: number | null
  dividendYield?: number | null
  marketCap?: bigint | null
  roe?: number | null
}) {
  let score = 50
  if (!f.peRatio && !f.dividendYield && !f.marketCap && !f.roe) return null
  if (f.peRatio && f.peRatio > 0 && f.peRatio < 15) score += 10
  if (f.peRatio && f.peRatio > 30) score -= 10
  if (f.dividendYield && f.dividendYield > 4) score += 10
  if (f.marketCap && Number(f.marketCap) > 1e10) score += 5
  if (f.roe && f.roe > 20) score += 10
  return Math.max(0, Math.min(100, score))
}

// ---------- Dicas de investimento ----------

export async function generateInvestmentTips(): Promise<{
  sections: string[]
  data: any
}> {
  const now = new Date()

  const [gainers, losers, fundamentals, events, sectorAssets] = await Promise.all([
    prisma.quote.findMany({
      where: { asset: { type: 'STOCK' } },
      orderBy: { changePct1D: 'desc' },
      take: 5,
      include: { asset: { select: { ticker: true, name: true, sector: true } } },
    }),
    prisma.quote.findMany({
      where: { asset: { type: 'STOCK' } },
      orderBy: { changePct1D: 'asc' },
      take: 5,
      include: { asset: { select: { ticker: true, name: true, sector: true } } },
    }),
    prisma.asset.findMany({
      where: { type: 'STOCK' },
      include: {
        fundamentals: { orderBy: { updatedAt: 'desc' }, take: 1 },
        quotes: { orderBy: { updatedAt: 'desc' }, take: 1 },
      },
    }),
    prisma.economicEvent.findMany({
      where: { date: { gte: now }, actual: null },
      orderBy: { date: 'asc' },
      take: 5,
    }),
    prisma.asset.findMany({
      where: { type: 'STOCK', sector: { not: null } },
      include: { quotes: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    }),
  ])

  const scored = fundamentals
    .filter((a) => a.fundamentals[0])
    .map((a) => {
      const f = a.fundamentals[0]!
      const score = fundamentalScore({
        peRatio: f.peRatio,
        dividendYield: f.dividendYield,
        marketCap: f.marketCap,
        roe: f.roe,
      })
      return { asset: a, fundamentals: f, quote: a.quotes[0], score }
    })
    .filter((x) => x.score != null)

  const opportunities = [...scored].sort((a, b) => (b.score! - a.score!)).slice(0, 5)
  const caution = [...scored].sort((a, b) => (a.score! - b.score!)).slice(0, 3)
  const dividendStars = [...scored]
    .filter((x) => (x.fundamentals.dividendYield ?? 0) > 4)
    .sort((a, b) => (b.fundamentals.dividendYield ?? 0) - (a.fundamentals.dividendYield ?? 0))
    .slice(0, 3)

  const bySector = new Map<string, { sum: number; n: number }>()
  for (const a of sectorAssets) {
    const s = a.sector!
    const cur = bySector.get(s) ?? { sum: 0, n: 0 }
    cur.sum += a.quotes[0]?.changePct1D ?? 0
    cur.n += 1
    bySector.set(s, cur)
  }
  const sectors = [...bySector.entries()]
    .map(([sector, v]) => ({ sector, avg: v.sum / v.n, n: v.n }))
    .sort((a, b) => b.avg - a.avg)

  const data = { gainers, losers, opportunities, caution, dividendStars, sectors, events }

  const sections = [
    `## Destaques do Dia\nMomentum positivo: ${gainers.map((g) => `${g.asset.ticker} (${fmt(g.changePct1D)}%)`).join(', ') || 'nenhum'}.\nPressao de venda: ${losers.map((l) => `${l.asset.ticker} (${fmt(l.changePct1D)}%)`).join(', ') || 'nenhum'}.`,
    `## Oportunidades Fundamentais\n${opportunities.length === 0 ? 'Sem dados fundamentais suficientes.' : opportunities.map((o) => `- ${o.asset.ticker} ${o.asset.name}: ${generateRecommendation({ peRatio: o.fundamentals.peRatio, dividendYield: o.fundamentals.dividendYield, marketCap: o.fundamentals.marketCap, roe: o.fundamentals.roe })}`).join('\n')}`,
    `## Renda Fixa / Dividendos\n${dividendStars.length === 0 ? 'Nenhum ativo com dividend yield destacado no momento.' : dividendStars.map((o) => `- ${o.asset.ticker}: dividend yield ${fmt(o.fundamentals.dividendYield, 2)}%`).join('\n')}`,
    `## Setores em Movimento\n${sectors.slice(0, 5).map((s) => `- ${s.sector}: variacao media ${fmt(s.avg, 2)}% (${s.n} ativos)`).join('\n') || 'Sem dados de setores.'}`,
    `## Eventos Economicos\n${events.length === 0 ? 'Nenhum evento (indicador) previsto nos proximos 7 dias.' : events.map((e) => `- ${e.date.toISOString().slice(0, 10)}: ${e.country} ${e.indicator} (${e.impact})`).join('\n')}`,
    `## Carteira Sugerida\n- Conservador: predominio de renda fixa + ativos com dividendos estaveis.\n- Moderado: mix entre renda fixa e acoes de qualidade.\n- Arrojado: maior exposicao aos ativos com momentum e setores em alta.\nObservacao: estas dicas sao geradas automaticamente a partir dos dados da plataforma e nao constituem recomendacao formal de investimento.`,
  ]
  return { sections, data }
}

// ---------- Esboco automatico do cliente ----------

export async function generateClientSketch(clientId: string): Promise<{
  sketch: string
  client: any
}> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      owner: { select: { name: true } },
      interests: true,
      tags: true,
      watchlists: { include: { assets: { include: { asset: { select: { ticker: true, name: true } } } } } },
      financialEvents: { orderBy: { date: 'desc' }, take: 10 },
      notes: { orderBy: { createdAt: 'desc' }, take: 5 },
      scores: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
  if (!client) throw new Error('Cliente não encontrado')

  const lastScore = client.scores[0]
  const watchlistAssets = client.watchlists.flatMap((w) => w.assets.map((a) => a.asset))
  const totalDeposits = client.financialEvents
    .filter((e) => ['INITIAL_DEPOSIT', 'REPEAT_DEPOSIT', 'FTD'].includes(e.type))
    .reduce((a, e) => a + e.amount, 0)
  const lastEvent = client.financialEvents[0]

  // Sugestoes de produtos conforme o perfil de risco
  let productSuggestions = 'Pendente de questionario de perfil — conclua o onboarding para dicas personalizadas.'
  if (client.riskProfile === 'CONSERVATIVE') {
    productSuggestions = 'Renda fixa, fundos DI, Tesouro, CDBs de bancos solidos e acoes com dividendos estaveis.'
  } else if (client.riskProfile === 'MODERATE') {
    productSuggestions = 'Mix de renda fixa (40-60%) com acoes diversificadas e ETFs; revisao semestral.'
  } else if (client.riskProfile === 'AGGRESSIVE') {
    productSuggestions = 'Maior exposicao a acoes de crescimento, setores com momentum e, se avancado, instrumentos com mais risco.'
  }

  const riskLabel = client.riskProfile ? RISK_PROFILE_LABELS[client.riskProfile] : null
  const typeLabel = client.clientType ? CLIENT_TYPE_LABELS[client.clientType] : null

  const sketch = [
    `## Perfil Resumido\n${client.name} — ${client.country ?? 'origem não informada'}. Cliente desde ${new Date(client.createdAt).toLocaleDateString('pt-BR')}. Status: ${client.status} · Risco de churn: ${client.churnRisk}% · Owner: ${client.owner?.name ?? '—'}.`,
    `## Investidor\n${
      riskLabel && typeLabel
        ? `Perfil de risco: ${riskLabel}. Tipo: ${typeLabel}. Onboarding concluido em ${client.onboardingCompletedAt ? new Date(client.onboardingCompletedAt).toLocaleDateString('pt-BR') : 'pendente'}.`
        : 'Ainda sem perfil definido (questionario de onboarding pendente).'
    }\nObjetivo declarado: ${client.objective ?? '—'} · Experiencia: ${client.experience ?? 'não informada'}.\nProdutos recomendados: ${productSuggestions}`,
    `## Interesses e Carteira\nInteresses: ${client.interests.map((i) => i.interest).join(', ') || 'nenhum registrado'}. Tags: ${client.tags.map((t) => t.tag).join(', ') || '—'}.\nWatchlist: ${watchlistAssets.map((a) => `${a.ticker} (${a.name})`).join(', ') || 'sem ativos acompanhados'}.`,
    `## Atividade Financeira\n${lastEvent ? `Ultima movimentacao: ${lastEvent.date.toISOString().slice(0, 10)} ${lastEvent.type} ${fmt(lastEvent.amount)} ${lastEvent.currency}.` : 'Sem movimentacoes registradas.'}\nDepositos totais: ${fmt(totalDeposits)} USD.`,
    `## Riscos e Retencao\nScore atual: ${lastScore?.score ?? '—'} · Ultimo contato: ${client.lastContactAt ? new Date(client.lastContactAt).toLocaleDateString('pt-BR') : 'nunca registrado'}.\n${client.churnRisk >= 50 ? 'Atencao: risco de churn elevado — acionar contato proximo.' : 'Perfil de retencao saudavel no momento.'}`,
    `## Proximos Passos\n- ${client.interests.length === 0 ? 'Registrar interesses de investimento.' : 'Revisar alinhamento da watchlist com o perfil de risco.'}\n- ${watchlistAssets.length === 0 ? 'Sugerir primeiros ativos conforme o perfil.' : 'Programar proximo contato e reavaliar retencao.'}\n- ${client.onboardingCompletedAt ? 'Apresentar relatorio mensal de carteira.' : 'Convidar o cliente a responder o questionario de perfil.'}`,
  ].join('\n\n')

  await prisma.clientNote.create({
    data: {
      clientId,
      content: `[IA] Esboco do cliente\n\n${sketch}`,
      authorId: null,
    },
  })

  return { sketch, client: sanitizeForJson(client) }
}

// ---------- Calculo de perfil a partir do questionario ----------

export function calculateProfile(answers: OnboardingAnswer[]): {
  riskProfile: RiskProfileResult
  clientType: ClientTypeResult
  score: number
  riskExplanation: string
} {
  const byId = new Map(answers.map((a) => [a.questionId, a.value]))
  const maxTotal = ONBOARDING_QUESTIONS.length * 3
  let total = 0
  for (const q of ONBOARDING_QUESTIONS) {
    const v = byId.get(q.id)
    if (v != null && v >= 0 && v <= 3) total += v
  }
  const pct = total / maxTotal

  const riskProfile: RiskProfileResult = pct < 0.34 ? 'CONSERVATIVE' : pct < 0.67 ? 'MODERATE' : 'AGGRESSIVE'

  const platformUse = byId.get('platform_use')
  const knowledge = byId.get('knowledge')
  const typeRaw = (platformUse ?? 0) * 0.6 + (knowledge ?? 0) * 0.4

  let clientType: ClientTypeResult
  if (platformUse === 3) clientType = 'PROFESSIONAL'
  else if (typeRaw >= 2.2) clientType = 'ADVANCED'
  else if (typeRaw >= 1.4) clientType = 'INTERMEDIATE'
  else if (typeRaw >= 0.6) clientType = 'ENTHUSIAST'
  else clientType = 'BEGINNER'

  const chosen = ONBOARDING_QUESTIONS.map((q) => {
    const v = byId.get(q.id)
    const opt = q.options.find((o) => o.value === v)
    return opt ? `${q.title}: ${opt.label}` : `${q.title}: não respondida`
  })

  const riskExplanation = [
    `${RISK_PROFILE_LABELS[riskProfile]} (${RISK_PROFILE_LABELS[riskProfile]} — score ${Math.round(pct * 100)}/100)`,
    `Tipo de usuario: ${CLIENT_TYPE_LABELS[clientType]}.`,
    chosen.join('\n'),
  ].join('\n')

  return { riskProfile, clientType, score: Math.round(pct * 100), riskExplanation }
}