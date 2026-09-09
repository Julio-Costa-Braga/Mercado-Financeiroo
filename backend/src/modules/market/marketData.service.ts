import { prisma } from '../../config/prisma'
import { logger } from '../../config/logger'
import { dispatch, EventTopics } from '../../config/events'

// M22 - Feed de mercado
// Atualiza as cotacoes em intervalos regulares (padrao 10 minutos).
// Estrategia:
//   CRYPTO -> CoinGecko (API publica, sem chave)
//   STOCK / ETF -> Stooq CSV (sem chave)
//   FOREX / INDEX -> Stooq CSV (com fallback)
// Qualquer falha de provider cai na simulacao local (random walk), garantindo
// que o selo "Atualizado ha X" e os eventos de socket sempre tenham dados frescos.

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000

const SIM_VOLATILITY: Record<string, number> = {
  CRYPTO: 0.025,
  STOCK: 0.012,
  ETF: 0.01,
  FOREX: 0.0012,
  INDEX: 0.004,
}

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'ripple',
  BNB: 'binancecoin',
  ADA: 'cardano',
}

// Funcao externa: Stooq CSV -> { symbol, open, high, low, close, volume }
async function fetchStooq(symbol: string): Promise<{
  close: number
  open: number
  high: number
  low: number
  volume: number
} | null> {
  const url = `https://stooq.com/q/l/?s=${symbol}&f=sd2t2ohlcv&h&e=csv`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    const text = await res.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) return null
    const cols = lines[1].split(',')
    // Date,Time,Open,High,Low,Close,Volume
    const open = parseFloat(cols[2])
    const high = parseFloat(cols[3])
    const low = parseFloat(cols[4])
    const close = parseFloat(cols[5])
    const volume = parseFloat(cols[6]) || 0
    if (!isFinite(close) || close <= 0) return null
    return { close, open: isFinite(open) ? open : close, high: isFinite(high) ? high : close, low: isFinite(low) ? low : close, volume }
  } catch {
    return null
  }
}

// Funcao externa: CoinGecko para criptos (1 chamada para todas)
async function fetchCoinGeckoPrices(): Promise<Map<string, { price: number; changePct1D: number; volume: number; marketCap: number }>> {
  const ids = Object.values(COINGECKO_IDS)
  if (ids.length === 0) return new Map()
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return new Map()
    const json: any = await res.json()
    const map = new Map<string, { price: number; changePct1D: number; volume: number; marketCap: number }>()
    for (const [ticker, coinId] of Object.entries(COINGECKO_IDS)) {
      const d = json?.[coinId]
      if (d?.usd) {
        map.set(ticker, {
          price: d.usd,
          changePct1D: d.usd_24h_change ?? 0,
          volume: d.usd_24h_vol ?? 0,
          marketCap: d.usd_market_cap ?? 0,
        })
      }
    }
    return map
  } catch {
    return new Map()
  }
}

function gaussianRandom() {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function simulateChange(assetType: string): number {
  const vol = SIM_VOLATILITY[assetType] ?? 0.01
  return gaussianRandom() * vol
}

type ExternalPrice = {
  price: number
  open?: number
  high?: number
  low?: number
  prevClose?: number
  volume?: number
  marketCap?: number
  changePct1D?: number
}

async function getExternalPrice(asset: {
  ticker: string
  type: string
  currency: string
}, coinMap: Map<string, { price: number; changePct1D: number; volume: number; marketCap: number }>): Promise<ExternalPrice | null> {
  try {
    if (asset.type === 'CRYPTO') {
      const coin = coinMap.get(asset.ticker.toUpperCase())
      if (coin) {
        return {
          price: coin.price,
          changePct1D: coin.changePct1D,
          volume: coin.volume,
          marketCap: coin.marketCap,
        }
      }
      return null
    }

    // STOCK/ETF/FOREX/INDEX via Stooq
    let symbol: string
    if (asset.type === 'FOREX') symbol = asset.ticker.toLowerCase()
    else if (asset.type === 'INDEX') symbol = `^${asset.ticker.toLowerCase()}`
    else symbol = `${asset.ticker.toLowerCase()}.us`

    const stooq = await fetchStooq(symbol)
    if (!stooq) return null
    const changePct1D = stooq.open && stooq.open > 0 ? ((stooq.close - stooq.open) / stooq.open) * 100 : 0
    return {
      price: stooq.close,
      open: stooq.open,
      high: stooq.high,
      low: stooq.low,
      prevClose: stooq.open,
      volume: stooq.volume,
      changePct1D,
    }
  } catch {
    return null
  }
}

export async function updateMarketQuotes(): Promise<{ updated: number; simulated: number; external: number }> {
  const assets = await prisma.asset.findMany({ where: { status: 'ACTIVE' } })
  const coinMap = await fetchCoinGeckoPrices()
  let updated = 0
  let simulated = 0
  let external = 0

  for (const asset of assets) {
    try {
      // Ultima cotacao do ativo (update in-place preserva high/low da sessao)
      const last = await prisma.quote.findFirst({
        where: { assetId: asset.id },
        orderBy: { updatedAt: 'desc' },
      })

      const prevPrice = last?.price ?? 0
      const prevClose = last?.prevClose ?? last?.price ?? 0

      const ext = await getExternalPrice(asset, coinMap)

      let price = prevPrice
      let changePct1D = last?.changePct1D ?? 0
      let high = last?.high
      let low = last?.low
      let open = last?.open
      let volume: bigint | undefined = last?.volume ?? undefined
      let marketCap: bigint | undefined = last?.marketCap ?? undefined
      let bid = last?.bid
      let ask = last?.ask

      if (ext) {
        price = ext.price
        changePct1D = ext.changePct1D ?? ((prevClose && prevPrice) ? ((price - prevClose) / prevClose) * 100 : 0)
        high = ext.high ?? price
        low = ext.low ?? price
        open = ext.open ?? price
        if (ext.volume != null) volume = BigInt(Math.round(ext.volume))
        if (ext.marketCap != null) marketCap = BigInt(Math.round(ext.marketCap))
        external++
      } else {
        // Fallback: random walk sobre a ultima cotacao
        const delta = simulateChange(asset.type)
        const next = prevPrice > 0 ? prevPrice * (1 + delta) : 10 + Math.random() * 40
        price = Math.max(0.0001, next)
        high = high != null ? Math.max(high, price) : price
        low = low != null ? Math.min(low, price) : price
        open = open ?? (prevPrice > 0 ? prevPrice : price)
        changePct1D = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0
        volume = BigInt((Number(volume ?? 0n) + Math.round(Math.random() * 20000)) || 1)
        simulated++
      }

      const spread = 0.0005 + Math.random() * 0.001
      bid = price * (1 - spread)
      ask = price * (1 + spread)

      const data = {
        price,
        bid,
        ask,
        open,
        high,
        low,
        prevClose,
        volume,
        marketCap,
        changePct1D,
        updatedAt: new Date(),
      }

      if (last) {
        await prisma.quote.update({ where: { id: last.id }, data })
      } else {
        await prisma.quote.create({
          data: { assetId: asset.id, ...data },
        })
      }

      updated++
      dispatch(EventTopics.QUOTE_UPDATED, {
        symbol: asset.ticker,
        type: asset.type,
        quote: {
          price,
          changePct1D,
          changePct5D: last?.changePct5D,
          changePct30D: last?.changePct30D,
          volume: volume?.toString(),
          marketCap: marketCap?.toString(),
          bid,
          ask,
          updatedAt: data.updatedAt,
        },
      })
    } catch (err: any) {
      logger.warn(`Market update falhou para ${asset.ticker}: ${err.message}`)
    }
  }

  logger.info(`[market] ${updated} cotacoes atualizadas (${external} externas, ${simulated} simuladas)`)
  return { updated, simulated, external }
}

let _timer: NodeJS.Timeout | null = null
let _running = false

export function startMarketUpdater() {
  const intervalMs = Number(process.env.MARKET_UPDATE_INTERVAL_MS || DEFAULT_INTERVAL_MS)
  if (_timer) clearInterval(_timer)

  const tick = async () => {
    if (_running) return
    _running = true
    try {
      await updateMarketQuotes()
    } catch (err: any) {
      logger.error(`[market] erro no updater: ${err.message}`)
    } finally {
      _running = false
    }
  }

  // Executa imediatamente ao subir para nao esperar o primeiro intervalo
  tick()
  _timer = setInterval(tick, Math.max(60_000, intervalMs))
  logger.info(`[market] atualizacao agendada a cada ${intervalMs / 60000} min`)
}

export { getExternalPrice as _getExternalPrice }