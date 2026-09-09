import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const generatedAt = new Date()
    const [movers, news, priorityClients, tasksToday, marketOverview] = await Promise.all([
      prisma.quote.findMany({
        where: { changePct1D: { not: null } },
        orderBy: { changePct1D: 'desc' },
        distinct: ['assetId'],
        include: { asset: true },
        take: 50,
      }),
      prisma.newsArticle.findMany({ orderBy: { publishedAt: 'desc' }, take: 10 }),
      prisma.client.findMany({
        where: { status: { in: ['ACTIVE', 'AT_RISK'] } },
        orderBy: [{ priorityScore: 'desc' }, { churnRisk: 'desc' }],
        take: 10,
        select: {
          id: true, name: true, country: true, status: true,
          priorityScore: true, churnRisk: true, lastContactAt: true,
        },
      }),
      prisma.task.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        orderBy: { dueAt: 'asc' },
        take: 10,
        include: { client: { select: { name: true } } },
      }),
      prisma.asset.findMany({
        where: { status: 'ACTIVE' },
        include: { quotes: { take: 1, orderBy: { updatedAt: 'desc' } } },
      }),
    ])

    // Market NOW - top 5 from each type
    const majorQuotes = ['BTC', 'ETH', 'EURUSD', 'GBPUSD', 'SPX', 'NDX']
    const marketNow = marketOverview
      .filter((a) => majorQuotes.some((t) => a.ticker.toUpperCase().includes(t.toUpperCase())))
      .map((a) => ({
        ticker: a.ticker,
        name: a.name,
        type: a.type,
        price: a.quotes[0]?.price,
        changePct1D: a.quotes[0]?.changePct1D,
        updatedAt: a.quotes[0]?.updatedAt ?? generatedAt,
      }))

    const gainers = movers.filter((q) => (q.changePct1D ?? 0) > 0).slice(0, 5)
    const losers = movers
      .filter((q) => (q.changePct1D ?? 0) < 0)
      .sort((a, b) => (a.changePct1D ?? 0) - (b.changePct1D ?? 0))
      .slice(0, 5)

    // Sector performance (same logic as market endpoint, without BigInt leak)
    const sectorAssets = await prisma.asset.findMany({
      where: { sector: { not: null }, type: 'STOCK' },
      include: { quotes: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    })
    const grouped = sectorAssets.reduce((acc, a) => {
      const key = a.sector!
      ;(acc[key] ||= { count: 0, avg1D: 0, gainers: 0, losers: 0 })
      const group = acc[key]
      const q = a.quotes[0]
      group.count++
      group.avg1D += q?.changePct1D ?? 0
      if ((q?.changePct1D ?? 0) > 0) group.gainers++
      if ((q?.changePct1D ?? 0) < 0) group.losers++
      return acc
    }, {} as Record<string, { count: number; avg1D: number; gainers: number; losers: number }>)
    const sectorPerformance = Object.entries(grouped)
      .map(([name, g]) => ({
        name,
        count: g.count,
        avgChangePct: +(g.avg1D / g.count).toFixed(2),
        gainers: g.gainers,
        losers: g.losers,
      }))
      .sort((a, b) => b.avgChangePct - a.avgChangePct)

    // Last time market quotes were written
    const latestQuote = await prisma.quote.findFirst({ orderBy: { updatedAt: 'desc' } })
    const marketUpdatedAt = latestQuote?.updatedAt ?? generatedAt

    res.json({
      lastUpdated: generatedAt,
      marketUpdatedAt,
      marketNow,
      topGainers: gainers.map((q) => ({ ticker: q.asset.ticker, changePct: q.changePct1D, price: q.price, updatedAt: q.updatedAt })),
      topLosers: losers.map((q) => ({ ticker: q.asset.ticker, changePct: q.changePct1D, price: q.price, updatedAt: q.updatedAt })),
      sectors: sectorPerformance,
      news: news.map((n) => ({ id: n.id, title: n.title, source: n.source, publishedAt: n.publishedAt, sentiment: n.sentiment })),
      priorityClients,
      tasksToday,
    })
  } catch (err) {
    next(err)
  }
}