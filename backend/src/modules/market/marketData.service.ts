import { prisma } from '../../config/prisma'
import { logger } from '../../config/logger'
import { dispatch, EventTopics } from '../../config/events'

// M22 - Feed de mercado
// Atualiza as cotacoes em intervalos regulares (padrao 10 minutos).
// Estrategia de fontes (sem chave):
//   CRYPTO -> CoinGecko (batch) -> Coinbase (spot) -> Yahoo (BTC-USD) -> simulacao
//   STOCK / ETF / INDEX -> Yahoo Finance (com User-Agent) -> simulacao
//   FOREX -> Yahoo Finance (EURUSD=X) -> simulacao
// A simulacao so roda como ultimo recurso e E ANCORADA no ultimo preco real
// obtido (em memoria), com variacao diaria preservada - assim nunca diverge
// muito da realidade quando um provider alguna falha.

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000

const SIM_VOLATILITY: Record<string, number> = {
  CRYPTO: 0.004,
  STOCK: 0.002,
  ETF: 0.0015,
  FOREX: 0.0006,
  INDEX: 0.0012,
}

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'ripple',
  BNB: 'binancecoin',
  ADA: 'cardano',
}

const YAHOO_INDEX: Record<string, string> = {
  SPX: '^GSPC',
  NDX: '^IXIC',
  DJI: '^DJI',
  DAX: '^GDAXI',
  STOXX: '^STOXX50E',
  PSI20: '^PSI20',
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

async function fetchJson(url: string, timeoutMs = 6500): Promise<any | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/plain,*/*' }, signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  } catch {
    return null
  }
}

type RawQuote = {
  price: number
  open?: number
  high?: number
  low?: number
  prevClose?: number
  volume?: number
  marketCap?: number
  changePct1D?: number
}

// Yahoo Finance (sem chave). Retorna cotacao do ultimo fechamento/mercado.
async function fetchYahoo(symbol: string): Promise<RawQuote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`
  const json = await fetchJson(url)
  const result = json?.chart?.result?.[0]
  if (!result?.meta) return null
  const meta = result.meta
  const quote = result.indicators?.quote?.[0]
  const price = Number(meta.regularMarketPrice)
  if (!isFinite(price) || price <= 0) return null
  const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? 0) || undefined
  const open = Number(quote?.open?.[0])
  const high = Number(quote?.high?.[0])
  const low = Number(quote?.low?.[0])
  const volume = Number(quote?.volume?.[quote.volume.length - 1])
  const calc = prevClose && prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0
  return {
    price,
    open: isFinite(open) && open > 0 ? open : undefined,
    high: isFinite(high) && high > 0 ? high : undefined,
    low: isFinite(low) && low > 0 ? low : undefined,
    prevClose: prevClose && prevClose > 0 ? prevClose : undefined,
    volume: isFinite(volume) && volume > 0 ? volume : undefined,
    changePct1D: calc,
  }
}

// CoinGecko: preco global ponderado + variacao 24h (1 chamada para todos)
async function fetchCoinGecko(): Promise<Map<string, { price: number; changePct1D: number; volume: number; marketCap: number }>> {
  const ids = Object.values(COINGECKO_IDS)
  if (ids.length === 0) return new Map()
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
  const json = await fetchJson(url, 7000)
  const map = new Map<string, { price: number; changePct1D: number; volume: number; marketCap: number }>()
  if (!json) return map
  for (const [ticker, coinId] of Object.entries(COINGECKO_IDS)) {
    const d = json?.[coinId]
    if (d?.usd) {
      map.set(ticker, {
        price: Number(d.usd),
        changePct1D: Number(d.usd_24h_change ?? 0),
        volume: Number(d.usd_24h_vol ?? 0),
        marketCap: Number(d.usd_market_cap ?? 0),
      })
    }
  }
  return map
}

// Coinbase spot (sem chave) - fallback para cripto
async function fetchCoinbase(ticker: string): Promise<number | null> {
  const json = await fetchJson(`https://api.coinbase.com/v2/prices/${ticker}-USD/spot`, 5000)
  const price = Number(json?.data?.amount)
  return isFinite(price) && price > 0 ? price : null
}

// Binance 24h ticker (sem chave) - ultimo fallback para cripto
async function fetchBinance(ticker: string): Promise<{ price: number; changePct1D: number } | null> {
  const json = await fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbol=${ticker}USDT`, 5000)
  const price = Number(json?.lastPrice)
  const change = Number(json?.priceChangePercent)
  if (!isFinite(price) || price <= 0) return null
  return { price, changePct1D: isFinite(change) ? change : 0 }
}

async function getExternalPrice(
  asset: { id: string; ticker: string; type: string },
  coinMap: Map<string, { price: number; changePct1D: number; volume: number; marketCap: number }>,
): Promise<RawQuote | null> {
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
      // Yahoo traz price + previousClose (variacao diaria correta) e tem rate limit amigo
      const y = await fetchYahoo(`${asset.ticker.toUpperCase()}-USD`)
      if (y) return y
      // Coinbase spot (sem variacao diaria)
      const cb = await fetchCoinbase(asset.ticker.toUpperCase())
      if (cb) return { price: cb }
      // Binance 24h ticker
      const bi = await fetchBinance(asset.ticker.toUpperCase())
      if (bi) return { price: bi.price, changePct1D: bi.changePct1D }
      return null
    }

    if (asset.type === 'INDEX') {
      const symbol = YAHOO_INDEX[asset.ticker.toUpperCase()] || `^${asset.ticker.toLowerCase()}`
      return fetchYahoo(symbol)
    }

    if (asset.type === 'FOREX') {
      return fetchYahoo(`${asset.ticker.toUpperCase()}=X`)
    }

    // STOCK / ETF
    return fetchYahoo(asset.ticker.toUpperCase())
  } catch {
    return null
  }
}

function gaussianRandom() {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// Ultimo preco REAL por ativo (em memoria). A simulacao se ancora aqui para
// nunca divergir muito enquanto um provider estiver fora.
const EXT_CACHE = new Map<string, { price: number; changePct1D: number | null }>()

export async function updateMarketQuotes(): Promise<{ updated: number; simulated: number; external: number }> {
  const assets = await prisma.asset.findMany({ where: { status: 'ACTIVE' } })
  const coinMap = await fetchCoinGecko()
  let updated = 0
  let simulated = 0
  let external = 0

  for (const asset of assets) {
    try {
      const last = await prisma.quote.findFirst({
        where: { assetId: asset.id },
        orderBy: { updatedAt: 'desc' },
      })

      const ext = await getExternalPrice(asset, coinMap)
      const cached = EXT_CACHE.get(asset.id)

      let price: number
      let changePct1D: number | null
      let high = last?.high ?? undefined
      let low = last?.low ?? undefined
      let open = last?.open ?? undefined
      let volume: bigint | undefined = last?.volume ?? undefined
      let marketCap: bigint | undefined = last?.marketCap ?? undefined
      let prevClose = last?.prevClose ?? undefined

      if (ext) {
        price = ext.price
        // Usa sempre a variacao diaria real da fonte; se a fonte (ex.: Coinbase
        // spot) nao fornecer, preserva a ultima variacao real conhecida (cache)
        // em vez de recalcular contra prevClose de seed desatualizado.
        const refPct = ext.changePct1D ?? cached?.changePct1D ?? last?.changePct1D ?? 0
        changePct1D = refPct

        if (last) {
          // Sessao nova? Se a variacao real for muito diferente da anterior,
          // assume inicio de nova sessao e reinicia high/low/open a partir do preco atual.
          if (ext.changePct1D != null) {
            high = ext.high ?? price
            low = ext.low ?? price
            open = ext.open ?? last.price ?? price
          } else {
            high = Math.max(last.high ?? price, price)
            low = Math.min(last.low ?? price, price)
            open = last.open ?? price
          }
        } else {
          high = ext.high ?? price
          low = ext.low ?? price
          open = ext.open ?? price
        }
        if (ext.prevClose != null) prevClose = ext.prevClose
        if (ext.volume != null) volume = BigInt(Math.round(ext.volume))
        if (ext.marketCap != null) marketCap = BigInt(Math.round(ext.marketCap))
        EXT_CACHE.set(asset.id, {
          price,
          changePct1D: ext.changePct1D ?? cached?.changePct1D ?? null,
        })
        external++
      } else {
        // Simulacao ancorada no ultimo preco real da sessao
        simulated++
        const vol = SIM_VOLATILITY[asset.type] ?? 0.003
        const base = cached?.price ?? last?.price ?? (10 + Math.random() * 40)
        const noise = gaussianRandom() * vol * 0.35
        price = Math.max(0.0001, base * (1 + noise))
        changePct1D = cached?.changePct1D ?? last?.changePct1D ?? 0

        // Atualiza os milde ancorados (high/low/open), sempre a partir do banco
        high = Math.max(last?.high ?? price, price)
        low = last?.low != null ? Math.min(last.low, price) : price
        open = last?.open ?? price
        const inc = Math.round(Math.random() * 2500)
        volume = BigInt((Number(volume ?? 0n) || 1) + inc)
        if (Number(volume) < 1000) volume = 1000n
      }

      const spread = 0.0003 + Math.random() * 0.0006
      const bid = price * (1 - spread)
      const ask = price * (1 + spread)
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
        await prisma.quote.create({ data: { assetId: asset.id, ...data } })
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

  tick()
  _timer = setInterval(tick, Math.max(60_000, intervalMs))
  logger.info(`[market] atualizacao agendada a cada ${intervalMs / 60000} min`)
}