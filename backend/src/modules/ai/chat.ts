import { prisma } from '../../config/prisma'
import { callLLM, getActiveModel } from './llm'

// M23 - Chat IA
// Responde perguntas sobre investimentos, mercado financeiro e cripto.
// Com GROQ_API_KEY/OPENAI_API_KEY delega ao modelo (com contexto do mercado);
// sem chave usa regras tematicas com dados reais da plataforma.

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

async function getSnapshot() {
  const [gainers, losers, btc, eth] = await Promise.all([
    prisma.quote.findMany({
      where: { asset: { type: 'STOCK' } },
      orderBy: { changePct1D: 'desc' },
      take: 3,
      include: { asset: { select: { ticker: true, name: true } } },
    }),
    prisma.quote.findMany({
      where: { asset: { type: 'STOCK' } },
      orderBy: { changePct1D: 'asc' },
      take: 3,
      include: { asset: { select: { ticker: true, name: true } } },
    }),
    prisma.quote.findFirst({
      where: { asset: { ticker: 'BTC', type: 'CRYPTO' } },
      orderBy: { updatedAt: 'desc' },
      include: { asset: { select: { ticker: true } } },
    }),
    prisma.quote.findFirst({
      where: { asset: { ticker: 'ETH', type: 'CRYPTO' } },
      orderBy: { updatedAt: 'desc' },
      include: { asset: { select: { ticker: true } } },
    }),
  ])

  const f = (n: number | null | undefined) => (n == null ? '—' : n.toFixed(2))
  return {
    text: [
      `Dados atuais (atualizados há poucos minutos):`,
      `BTC ${f(btc?.price)} USD (${f(btc?.changePct1D)}% 1D) · ETH ${f(eth?.price)} USD (${f(eth?.changePct1D)}% 1D)`,
      `Maiores altas: ${gainers.map((g) => `${g.asset.ticker} (${f(g.changePct1D)}%)`).join(', ') || '—'}`,
      `Maiores quedas: ${losers.map((l) => `${l.asset.ticker} (${f(l.changePct1D)}%)`).join(', ') || '—'}`,
    ].join('\n'),
    btc: btc ?? null,
    eth: eth ?? null,
    gainers,
    losers,
  }
}

function matchAny(message: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(message.toLowerCase()))
}

async function buildTemplateAnswer(message: string): Promise<string> {
  const m = message.toLowerCase()
  const snap = await getSnapshot()

  if (matchAny(m, [/\b(oi|ola|olá|hello|eai|e aí|bom dia|boa tarde|boa noite)\b/])) {
    return [
      'Olá! Sou o assistente de investimentos da Market Now.',
      '',
      'Posso ajudar com dicas de investimento, dúvidas sobre o mercado financeiro, ações, criptomoedas, renda fixa, diversificação e muito mais.',
      '',
      'Experimente perguntar: "O que está em alta hoje?", "Vale investir em cripto?", ou "Como diversificar minha carteira?".',
    ].join('\n')
  }

  if (matchAny(m, [/\b(cripto|crypto|bitcoin|btc|ethereum|eth|solana|cardano|bnb|xrp|altcoin|nft|criptomoeda)\b/])) {
    const btc = snap.btc
    const eth = snap.eth
    return [
      'Sobre criptomoedas:',
      '',
      `- Bitcoin está em ${btc?.price ? `US$ ${btc.price.toFixed(2)}` : '—'} (${btc?.changePct1D != null ? `${btc.changePct1D.toFixed(2)}% em 1D` : '—'}).`,
      `- Ethereum está em ${eth?.price ? `US$ ${eth.price.toFixed(2)}` : '—'} (${eth?.changePct1D != null ? `${eth.changePct1D.toFixed(2)}% em 1D` : '—'}).`,
      '',
      'Cripto é o ativo de maior risco e volatilidade da carteira. Recomenda-se:',
      '- Alocar apenas uma fatia pequena (ex.: 1-5%) de um portfólio diversificado;',
      '- Não usar capital de reserva de emergência;',
      '- Investir o que estiver disposto a perder sem comprometer objetivos;',
      '- Preferir corretoras reguladas e carteiras próprias (cold wallet) para valores altos.',
    ].join('\n')
  }

  if (matchAny(m, [/\b(renda fixa|tesouro|cdb|lci|lca|poupança|poupanca|prefixado|pos-fixado|pós-fixado)\b/])) {
    return [
      'Renda fixa é a classe mais segura e adequada para reservas e prazos definidos:',
      '',
      '- Tesouro Direto (Selic, IPCA+, Prefixado): opção mais acessível e garantida pelo Tesouro Nacional;',
      '- CDB: emissão de bancos, com garantia do FGC até US$ 250 mil por instituição;',
      '- LCI/LCA: isentas de IR para pessoa física, mas exigem prazos mínimos (90 dias+);',
      '- Poupança: muita liquidez, mas rende abaixo da inflação no longo prazo.',
      '',
      'Regra prática: quanto maior o prazo e o risco de crédito, maior deve ser o retorno. Se o retorno pago está muito acima do mercado, desconfie.',
      ].join('\n')
  }

  if (matchAny(m, [/\b(acao|ação|acoes|ações|bolsa|stock|stocks|renda variavel|renda variável|equity)\b/])) {
    const top = snap.gainers.map((g) => `${g.asset.ticker} (${g.changePct1D?.toFixed(2)}%)`).join(', ')
    return [
      'Ações (renda variável) podem gerar bons retornos no longo prazo, mas oscilam bastante no curto prazo:',
      '',
      `- Maiores altas agora na plataforma: ${top || 'sem dados'}.`,
      '- Diversifique entre setores e empresas (ex.: tecnologia, financeiro, saúde, energia);',
      '- Tenha horizonte de 3-5 anos+ para reduzir o efeito das oscilações;',
      '- Avalie fundamentos (P/L, dividendos, ROE) e não apenas a cotação do dia;',
      '- Se for iniciante, comece por ETFs que replicam índices.',
      ].join('\n')
  }

  if (matchAny(m, [/\betf\b|\bfundo[s]?\b|\bfii\b|\bfundo imobili\w*\b/])) {
    return [
      'Fundos e ETFs simplificam a diversificação:',
      '',
      '- ETFs: negociados como ações na bolsa, com taxas baixas e possibilidade de compra fracionada (ex.: SPY, QQQ, IVV, VTI);',
      '- Fundos imobiliários (FIIs): rendem aluguéis distribuídos mensalmente e são isentos de IR para PF;',
      '- Fundos tradicionais: gestão profissional, porém com taxas de administração que reduzem o retorno.',
      '',
      'Dica: prefira ETFs com TER (taxa) baixa e que exponham a índices amplos ao começar.',
      ].join('\n')
  }

  if (matchAny(m, [/\bdividend|rendimento|proventos|pag[au] di\/dividendos\b/])) {
    return [
      'Dividendos são partes do lucro distribuídas aos acionistas:',
      '',
      '- Empresas maduras e estáveis (bancos, energia, consumo) costumam distribuir mais;',
      '- Dividend Yield alto pode sinalizar valor ou problema no preço da ação — analise o contexto;',
      '- Dividendos físicos em FIIs são isentos de IR para pessoa física; em ações, há isenção até R$ 20 mil/mês em vendas de até R$ 20 mil.',
      '',
      'Na plataforma, ative o alerta de dividendos ou peça um briefing por ativo para ver o histórico.',
      ].join('\n')
  }

  if (matchAny(m, [/\bdiversific|carteira|portfolio|alocac|\breserva de emerg\w+/])) {
    return [
      'Diversificação é a estratégia mais eficaz para reduzir risco sem abrir mão de retorno:',
      '',
      '- 1º: Reserva de emergência em renda fixa líquida (ex.: Tesouro Selic ou CDB com liquidez diária), de 3 a 6 meses de custo de vida;',
      '- 2º: Defina o horizonte e o perfil de risco (conservador/moderado/arrojado);',
      '- 3º: Distribua por classes (renda fixa, ações, ETFs, internacional, cripto se couber);',
      '- 4º: Rebalanceie 1-2 vezes por ano, vendendo o que valorizou e comprando o que caiu.',
      '',
      'Na plataforma, responda o questionário de perfil na ficha do cliente para receber sugestões personalizadas.',
      ].join('\n')
  }

  if (matchAny(m, [/\baposent|longo prazo|juros compostos|montante|acumular\b/])) {
    return [
      'Investir para o longo prazo (aposentadoria) aproveita os juros compostos:',
      '',
      '- Quanto mais cedo começar, menor o aporte mensal necessário;',
      '- Aloque em ativos de crescimento (ações/ETFs) com horizonte de 10 anos+;',
      '- Evite resgates por emoção em quedas;',
      '- Reavaliar a alocação a cada 5 anos, reduzindo risco conforme a data de uso se aproxima.',
      '',
      `Para planejar: defina o valor meta e o prazo, e então calcule o aporte mensal necessário (a plataforma pode ajudar com briefing por perfil).`,
      ].join('\n')
  }

  if (matchAny(m, [/\b(juros|inflaç|inflaca|selic|ipca|cdi|econ\w+)\b/])) {
    return [
      'Juros e inflação afetam diretamente seus investimentos:',
      '',
      '- Selic alta favorece renda fixa pós-fixada (Tesouro Selic, CDB 100%+ do CDI);',
      '- IPCA+ protege o poder de compra no longo prazo (ótimo para apostas de longo prazo);',
      '- Inflação alta pressiona renda variável no curto prazo, mas empresas com pricing power costumam se recuperar;',
      '- Prefixed não são recomendados quando a inflação está subindo.',
      ].join('\n')
  }

  if (matchAny(m, [/\b(mercado hoje|em alta|em baixa|ganhadores|quedas|caindo|altas|resumo|situac\w+ dos mercados|noticias|notícias do mercado)\b/])) {
    return [
      'Resumo rápido do mercado agora:',
      '',
      snap.text,
      '',
      'Quer aprofundar em algum ativo ou setor? Peça um briefing por ativo na aba "Briefings" ou pergunte aqui.',
      ].join('\n')
  }

  if (matchAny(m, [/\bo que (é|e|sao|são)\b|\bexplica\b|\bcomo funciona\b|\bsignific\w+\b|\bbásico\b|\bbasico\b/])) {
    return [
      'Posso explicar conceitos do mercado financeiro e cripto de forma simples.',
      '',
      'Alguns temas que domino: renda fixa, ações, ETFs, dividendos, criptomoedas, diversificação, juros, inflação, perfil de investidor.',
      '',
      snap.text,
      '',
      'Pergunte algo como: "O que é renda fixa?", "Como funciona um ETF?" ou "O que é diversificação?".',
    ].join('\n')
  }

  // Fallback generico
  return [
    'Entendi! Vou te ajudar com isso.',
    '',
    'Com base no que sei: invista de acordo com o seu perfil de risco, mantenha uma reserva de emergência e diversifique entre classes de ativos.',
    '',
    `Para contextualizar: ${snap.text}`,
    '',
    'Se precisar de detalhes, pergunte sobre renda fixa, ações, cripto, dividendos, diversificação ou peça um briefing por ativo na aba "Briefings".',
  ].join('\n')
}

export async function answerQuestion(message: string, history: ChatMessage[] = []): Promise<{
  reply: string
  ai: boolean
  model: string
}> {
  const snapshot = await getSnapshot()
  const template = await buildTemplateAnswer(message)

  const model = getActiveModel()
  if (model === 'template') {
    return { reply: template, ai: false, model: 'template' }
  }

  const system = [
    'Você é o assistente de investimentos da plataforma Market Now.',
    'Responda em português, de forma clara, didática e com noções de gestão de risco.',
    'Use os dados de mercado abaixo para contextualizar quando fizer sentido.',
    '',
    snapshot.text,
  ].join('\n')

  const messages = [
    { role: 'system' as const, content: system },
    ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: message },
  ]

  const ai = await callLLM(messages)
  if (!ai) return { reply: template, ai: false, model: 'template' }
  return { reply: ai.output, ai: true, model }
}