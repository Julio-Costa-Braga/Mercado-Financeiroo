import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Errors } from '../../utils/errors'

const ASSET_SELECT = {
  id: true,
  ticker: true,
  name: true,
  type: true,
  market: true,
  country: true,
  exchange: true,
  sector: true,
  industry: true,
  currency: true,
}

async function getQuoteMap(assetIds: string[]) {
  if (assetIds.length === 0) return new Map()
  const quotes = await prisma.quote.findMany({
    where: { assetId: { in: assetIds } },
    orderBy: { updatedAt: 'desc' },
    distinct: ['assetId'],
  })
  const map = new Map<string, any>()
  quotes.forEach((q) => {
    if (!map.has(q.assetId)) {
      map.set(q.assetId, {
        price: q.price,
        bid: q.bid,
        ask: q.ask,
        open: q.open,
        high: q.high,
        low: q.low,
        prevClose: q.prevClose,
        volume: q.volume?.toString(),
        marketCap: q.marketCap?.toString(),
        changePct1D: q.changePct1D,
        changePct5D: q.changePct5D,
        changePct30D: q.changePct30D,
        updatedAt: q.updatedAt,
      })
    }
  })
  return map
}

async function getFundamentalMap(assetIds: string[]) {
  if (assetIds.length === 0) return new Map()
  const funds = await prisma.fundamental.findMany({
    where: { assetId: { in: assetIds } },
    distinct: ['assetId'],
    orderBy: { updatedAt: 'desc' },
  })
  const map = new Map<string, any>()
  funds.forEach((f) => {
    if (!map.has(f.assetId)) {
      map.set(f.assetId, {
        marketCap: f.marketCap?.toString(),
        peRatio: f.peRatio,
        psRatio: f.psRatio,
        pbRatio: f.pbRatio,
        evEbitda: f.evEbitda,
        dividendYield: f.dividendYield,
        revenue: f.revenue?.toString(),
        ebitda: f.ebitda?.toString(),
        netIncome: f.netIncome?.toString(),
        eps: f.eps,
        roe: f.roe,
        roa: f.roa,
        debt: f.debt?.toString(),
        cash: f.cash?.toString(),
        aum: f.aum?.toString(),
        expenseRatio: f.expenseRatio,
      })
    }
  })
  return map
}

export async function getAssets(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      type, market, country, exchange, sector, industry, currency,
      search, page = '1', limit = '50', sortBy, sortOrder = 'desc',
    } = req.query as any

    const where: any = {}
    if (type) where.type = type
    if (market) where.market = market
    if (country) where.country = country
    if (exchange) where.exchange = exchange
    if (sector) where.sector = sector
    if (industry) where.industry = industry
    if (currency) where.currency = currency
    if (search) {
      where.OR = [
        { ticker: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }
    where.status = 'ACTIVE'

    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))
    const orderBy: any = {}
    if (sortBy && ['ticker', 'name', 'marketCap', 'price'].includes(sortBy)) {
      if (sortBy === 'marketCap' || sortBy === 'price') {
        const assets = await prisma.asset.findMany({ where, select: ASSET_SELECT })
        return res.json({ assets, total: assets.length })
      }
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc'
    }

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: Object.keys(orderBy).length ? orderBy : { ticker: 'asc' },
        select: ASSET_SELECT,
      }),
    ])

    const quoteMap = await getQuoteMap(assets.map((a) => a.id))
    const fundMap = await getFundamentalMap(assets.map((a) => a.id))

    const result = assets.map((a) => ({
      ...a,
      quote: quoteMap.get(a.id) || null,
      fundamentals: fundMap.get(a.id) || null,
    }))

    res.json({ assets: result, total, page: pageNum, limit: limitNum })
  } catch (err) {
    next(err)
  }
}

export async function getAsset(req: Request, res: Response, next: NextFunction) {
  try {
    const { ticker } = req.params
    const asset = await prisma.asset.findFirst({
      where: { ticker: ticker.toUpperCase() },
      select: ASSET_SELECT,
    })
    if (!asset) throw Errors.notFound('Ativo não encontrado')

    const [quoteMap, fundMap, sectors, earnings, news] = await Promise.all([
      getQuoteMap([asset.id]),
      getFundamentalMap([asset.id]),
      prisma.assetSectorHistory.findMany({
        where: { assetId: asset.id },
        include: { sector: true },
        take: 20,
      }),
      prisma.earningsEvent.findMany({
        where: { assetId: asset.id },
        orderBy: { reportDate: 'desc' },
        take: 8,
      }),
      prisma.newsAssetLink.findMany({
        where: { assetId: asset.id },
        include: { news: true },
        orderBy: { news: { publishedAt: 'desc' } },
        take: 20,
      }),
    ])

    res.json({
      asset: {
        ...asset,
        quote: quoteMap.get(asset.id) || null,
        fundamentals: fundMap.get(asset.id) || null,
        sectorHistory: sectors.map((s) => s.sector),
        earnings: earnings.map((e) => ({
          reportDate: e.reportDate,
          epsEstimate: e.epsEstimate,
          epsActual: e.epsActual,
          revenueEstimate: e.revenueEstimate?.toString(),
          revenueActual: e.revenueActual?.toString(),
        })),
        news: news.map((n) => ({
          id: n.news.id,
          title: n.news.title,
          source: n.news.source,
          publishedAt: n.news.publishedAt,
          sentiment: n.news.sentiment,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function getBars(req: Request, res: Response, next: NextFunction) {
  try {
    const { assetId, interval = '1D', range = '100' } = req.query as any
    if (!assetId) throw Errors.badRequest('assetId é obrigatório')

    const bars = await prisma.bar.findMany({
      where: { assetId, interval },
      orderBy: { timestamp: 'desc' },
      take: Math.min(1000, parseInt(range) || 100),
    })

    res.json({ bars: bars.reverse() })
  } catch (err) {
    next(err)
  }
}

export async function getMarketOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const allTypes = ['STOCK', 'CRYPTO', 'FOREX', 'ETF', 'INDEX']
    const [assets, quotes] = await Promise.all([
      prisma.asset.findMany({ where: { status: 'ACTIVE' } }),
      prisma.quote.findMany({ orderBy: { updatedAt: 'desc' }, distinct: ['assetId'] }),
    ])

    const quoteByAsset = new Map(quotes.map((q) => [q.assetId, q]))

    const byType = allTypes.reduce((acc, t) => {
      const items = assets.filter((a) => a.type === t)
      const withQuotes = items
        .map((a) => {
          const q = quoteByAsset.get(a.id)
          return { ...a, quote: q ? { price: q.price, changePct1D: q.changePct1D, changePct5D: q.changePct5D, changePct30D: q.changePct30D } : null }
        })
        .sort((x, y) => (y.quote?.changePct1D ?? -Infinity) - (x.quote?.changePct1D ?? -Infinity))
      acc[t.toLowerCase()] = withQuotes.slice(0, 10)
      return acc
    }, {} as any)

    res.json(byType)
  } catch (err) {
    next(err)
  }
}

export async function getSectors(req: Request, res: Response, next: NextFunction) {
  try {
    const sectors = await prisma.sector.findMany({
      include: { children: true },
    })
    res.json({ sectors })
  } catch (err) {
    next(err)
  }
}

export async function getGainersLosers(req: Request, res: Response, next: NextFunction) {
  try {
    const quotes = await prisma.quote.findMany({
      where: { changePct1D: { not: null } },
      orderBy: { changePct1D: 'desc' },
      distinct: ['assetId'],
      include: { asset: true },
    })

    const gainers = quotes.filter((q) => (q.changePct1D ?? 0) > 0).slice(0, 10)
    const losers = quotes
      .filter((q) => (q.changePct1D ?? 0) < 0)
      .sort((a, b) => (a.changePct1D ?? 0) - (b.changePct1D ?? 0))
      .slice(0, 10)

    res.json({
      gainers: gainers.map((q) => ({ ticker: q.asset.ticker, name: q.asset.name, changePct: q.changePct1D, price: q.price })),
      losers: losers.map((q) => ({ ticker: q.asset.ticker, name: q.asset.name, changePct: q.changePct1D, price: q.price })),
    })
  } catch (err) {
    next(err)
  }
}
