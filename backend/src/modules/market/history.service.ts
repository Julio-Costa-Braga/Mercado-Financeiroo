import { prisma } from '../../config/prisma'
import { logger } from '../../config/logger'
import { dispatch, EventTopics } from '../../config/events'

// M22 - Historico real de pregos (velas OHLCV)
// Busca dados historicos reais no Yahoo Finance e cacheia no banco (tabela Bar).
// Se o Yahoo falhar, mantem os dados que ja estao no banco (seed/simulados).

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

const YAHOO_INDEX: Record<string, string> = {
  SPX: '^GSPC',
  NDX: '^IXIC',
  DJI: '^DJI',
  DAX: '^GDAXI',
  STOXX: '^STOXX50E',
  PSI20: '^PSI20',
}

export function yahooSymbol(asset: { ticker: string; type: string }): string {
  const t = asset.ticker.toUpperCase()
  if (asset.type === 'CRYPTO') return `${t}-USD`
  if (asset.type === 'INDEX') return YAHOO_INDEX[t] || `^${t.toLowerCase()}`
  if (asset.type === 'FOREX') return `${t}=X`
  return t
}

const RANGE_MAP: Record<string, { range: string; interval: string }> = {
  '1D': { range: '1d', interval: '5m' },
  '5D': { range: '5d', interval: '30m' },
  '1M': { range: '1mo', interval: '1d' },
  '3M': { range: '3mo', interval: '1d' },
  '6M': { range: '6mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
  '5Y': { range: '5y', interval: '1wk' },
}

// Cache em memoria: nao hitamos o Yahoo a cada requisicao do grafico
const CACHE = new Map<string, number>()

export async function fetchRealBars(
  asset: { id: string; ticker: string; type: string },
  interval: string,
): Promise<'fetched' | 'cache' | 'fallback-db'> {
  const cfg = RANGE_MAP[interval.toUpperCase()] || RANGE_MAP['1D']
  const key = `${asset.id}:${interval}`
  const lastFetch = CACHE.get(key)
  if (lastFetch && Date.now() - lastFetch < 15 * 60 * 1000) return 'cache'

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(asset))}?interval=${cfg.interval}&range=${cfg.range}`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/plain,*/*' }, signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return 'fallback-db'
    const json: any = await res.json()
    const result = json?.chart?.result?.[0]
    const ts: number[] = result?.timestamp
    const q = result?.indicators?.quote?.[0]
    if (!Array.isArray(ts) || !q) return 'fallback-db'

    const rows: Array<{ open: number; high: number; low: number; close: number; volume: bigint; timestamp: Date }> = []
    for (let i = 0; i < ts.length; i++) {
      const close = Number(q.close?.[i])
      if (!isFinite(close) || close <= 0) continue
      const open = Number(q.open?.[i])
      const high = Number(q.high?.[i])
      const low = Number(q.low?.[i])
      const volume = Number(q.volume?.[i])
      rows.push({
        open: isFinite(open) ? open : close,
        high: isFinite(high) ? high : close,
        low: isFinite(low) ? low : close,
        close,
        volume: BigInt(Math.max(0, Math.round(volume || 0))),
        timestamp: new Date(ts[i] * 1000),
      })
    }
    if (rows.length === 0) return 'fallback-db'

    await prisma.$transaction([
      prisma.bar.deleteMany({ where: { assetId: asset.id, interval } }),
      prisma.bar.createMany({ data: rows.map((r) => ({ assetId: asset.id, interval, ...r })) }),
    ])
    dispatch(EventTopics.BAR_UPDATED, { assetId: asset.id, symbol: asset.ticker, interval, count: rows.length })
    CACHE.set(key, Date.now())
    return 'fetched'
  } catch (err: any) {
    logger.warn(`[history] Yahoo falhou para ${asset.ticker} (${interval}): ${err.message}`)
    return 'fallback-db'
  }
}