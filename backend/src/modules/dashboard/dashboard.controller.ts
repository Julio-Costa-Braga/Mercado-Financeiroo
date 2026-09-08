import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
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
      }))

    const gainers = movers.filter((q) => (q.changePct1D ?? 0) > 0).slice(0, 5)
    const losers = movers
      .filter((q) => (q.changePct1D ?? 0) < 0)
      .sort((a, b) => (a.changePct1D ?? 0) - (b.changePct1D ?? 0))
      .slice(0, 5)

    // Sector performance
    const sectors = await prisma.sector.findMany({})
    const sectorPerformance: { name: string; changePct: number }[] = []

    res.json({
      marketNow,
      topGainers: gainers.map((q) => ({ ticker: q.asset.ticker, changePct: q.changePct1D, price: q.price })),
      topLosers: losers.map((q) => ({ ticker: q.asset.ticker, changePct: q.changePct1D, price: q.price })),
      sectors: sectorPerformance,
      news: news.map((n) => ({ id: n.id, title: n.title, source: n.source, publishedAt: n.publishedAt, sentiment: n.sentiment })),
      priorityClients,
      tasksToday,
    })
  } catch (err) {
    next(err)
  }
}