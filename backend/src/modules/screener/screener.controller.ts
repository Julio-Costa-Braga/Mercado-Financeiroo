import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'

export async function screener(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      type = 'STOCK',
      sector, industry, country, exchange,
      minPrice, maxPrice,
      minChange1D, maxChange1D,
      minChange5D, minChange30D, maxChange30D,
      minVolume, minRelativeVolume,
      marketCapBucket, // micro, small, mid, large, mega
      maxPe, maxPs, maxPb, maxEvEbitda,
      minRevenueGrowth, minEpsGrowth, minRoe, minMargin,
      search, limit = '100',
    } = req.query as any

    const where: any = { status: 'ACTIVE' }

    if (type) where.type = type
    if (sector) where.sector = sector
    if (industry) where.industry = industry
    if (country) where.country = country
    if (exchange) where.exchange = exchange
    if (search) {
      where.OR = [
        { ticker: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }

    const assets = await prisma.asset.findMany({
      where,
      take: Math.min(500, parseInt(limit) || 100),
      include: {
        quotes: { take: 1, orderBy: { updatedAt: 'desc' } },
        fundamentals: { take: 1, orderBy: { updatedAt: 'desc' } },
      },
    })

    let result = assets.filter((a) => {
      const q = a.quotes[0]
      const f = a.fundamentals[0]
      if (!q) return false

      // Price
      if (minPrice && q.price < parseFloat(minPrice)) return false
      if (maxPrice && q.price > parseFloat(maxPrice)) return false

      // Performance
      if (minChange1D !== undefined && (q.changePct1D ?? -999) < parseFloat(minChange1D)) return false
      if (maxChange1D !== undefined && (q.changePct1D ?? 999) > parseFloat(maxChange1D)) return false
      if (minChange5D !== undefined && (q.changePct5D ?? -999) < parseFloat(minChange5D)) return false
      if (minChange30D !== undefined && (q.changePct30D ?? -999) < parseFloat(minChange30D)) return false
      if (maxChange30D !== undefined && (q.changePct30D ?? 999) > parseFloat(maxChange30D)) return false

      // Volume
      if (minVolume && Number(q.volume ?? 0) < parseFloat(minVolume)) return false

      // Market cap bucket
      if (marketCapBucket && f?.marketCap) {
        const mc = Number(f.marketCap)
        const buckets: Record<string, [number, number]> = {
          micro: [0, 3e8],
          small: [3e8, 2e9],
          mid: [2e9, 1e10],
          large: [1e10, 2e11],
          mega: [2e11, Infinity],
        }
        const [lo, hi] = buckets[marketCapBucket as string] || [0, Infinity]
        if (mc < lo || mc > hi) return false
      }

      // Valuation
      if (maxPe !== undefined && f?.peRatio !== null && f?.peRatio !== undefined && f.peRatio > parseFloat(maxPe)) return false
      if (maxPs !== undefined && f?.psRatio !== null && f?.psRatio !== undefined && f.psRatio > parseFloat(maxPs)) return false
      if (maxPb !== undefined && f?.pbRatio !== null && f?.pbRatio !== undefined && f.pbRatio > parseFloat(maxPb)) return false
      if (maxEvEbitda !== undefined && f?.evEbitda !== null && f?.evEbitda !== undefined && f.evEbitda > parseFloat(maxEvEbitda)) return false

      // Fundamentals
      if (minRoe !== undefined && f?.roe !== null && f?.roe !== undefined && f.roe < parseFloat(minRoe)) return false

      return true
    })

    res.json({
      results: result.map((a) => ({
        id: a.id,
        ticker: a.ticker,
        name: a.name,
        sector: a.sector,
        industry: a.industry,
        price: a.quotes[0]?.price,
        changePct1D: a.quotes[0]?.changePct1D,
        changePct5D: a.quotes[0]?.changePct5D,
        changePct30D: a.quotes[0]?.changePct30D,
        volume: a.quotes[0]?.volume?.toString(),
        marketCap: a.fundamentals[0]?.marketCap?.toString(),
        peRatio: a.fundamentals[0]?.peRatio,
        psRatio: a.fundamentals[0]?.psRatio,
        pbRatio: a.fundamentals[0]?.pbRatio,
        evEbitda: a.fundamentals[0]?.evEbitda,
        roe: a.fundamentals[0]?.roe,
        roa: a.fundamentals[0]?.roa,
      })),
      count: result.length,
    })
  } catch (err) {
    next(err)
  }
}