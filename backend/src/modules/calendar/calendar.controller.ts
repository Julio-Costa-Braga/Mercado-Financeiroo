import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'

export async function getCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const { country, impact, indicator, date, from, to, page = '1', limit = '50' } = req.query as any

    const where: any = {}
    if (country) where.country = country
    if (impact) where.impact = impact
    if (indicator) where.indicator = { contains: indicator, mode: 'insensitive' }
    if (date) {
      const d = new Date(date)
      const start = new Date(d); start.setHours(0, 0, 0, 0)
      const end = new Date(d); end.setHours(23, 59, 59, 999)
      where.date = { gte: start, lte: end }
    }
    if (from || to) {
      where.date = where.date || {}
      if (from) where.date.gte = new Date(from as string)
      if (to) where.date.lte = new Date(to as string)
    }

    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))

    const [total, events] = await Promise.all([
      prisma.economicEvent.count({ where }),
      prisma.economicEvent.findMany({
        where,
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ])

    res.json({ events, total, page: pageNum, limit: limitNum })
  } catch (err) {
    next(err)
  }
}

export async function getUpcoming(req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date()
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7)
    weekEnd.setHours(23, 59, 59, 999)

    const events = await prisma.economicEvent.findMany({
      where: {
        date: { gte: start, lte: weekEnd },
        actual: null,
      },
      orderBy: { date: 'asc' },
      take: 30,
    })

    res.json({ events })
  } catch (err) {
    next(err)
  }
}