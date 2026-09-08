import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Errors } from '../../utils/errors'

export async function getIndicators(req: Request, res: Response, next: NextFunction) {
  try {
    const { country, region } = req.query as any
    const where: any = {}
    if (country) where.country = country
    if (region) where.region = region

    const indicators = await prisma.economicIndicator.findMany({
      where,
      orderBy: [{ country: 'asc' }, { code: 'asc' }],
      include: {
        observations: {
          orderBy: { period: 'desc' },
          take: 12,
        },
      },
    })

    res.json({
      indicators: indicators.map((i) => ({
        ...i,
        observations: i.observations.map((o) => ({
          ...o,
          value: o.value,
          previous: o.previous,
        })),
      })),
    })
  } catch (err) {
    next(err)
  }
}

export async function getIndicator(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.params
    const indicator = await prisma.economicIndicator.findUnique({
      where: { code: code.toUpperCase() },
      include: { observations: { orderBy: { period: 'desc' }, take: 60 } },
    })
    if (!indicator) throw Errors.notFound('Indicador não encontrado')

    res.json({ indicator })
  } catch (err) {
    next(err)
  }
}

export async function getObservations(req: Request, res: Response, next: NextFunction) {
  try {
    const { country, region, limit = '100' } = req.query as any
    const where: any = {}
    if (country || region) {
      where.indicator = {}
      if (country) where.indicator.country = country
      if (region) where.indicator.region = region
    }

    const observations = await prisma.economicObservation.findMany({
      where,
      orderBy: { period: 'desc' },
      take: Math.min(500, parseInt(limit) || 100),
      include: { indicator: { select: { code: true, name: true, country: true, unit: true } } },
    })

    res.json({ observations })
  } catch (err) {
    next(err)
  }
}

export async function getRegions(req: Request, res: Response, next: NextFunction) {
  try {
    const countries = await prisma.economicIndicator.findMany({
      distinct: ['country'],
      select: { country: true },
    })
    const regions = await prisma.economicIndicator.findMany({
      distinct: ['region'],
      select: { region: true },
    })
    res.json({
      countries: countries.map((c) => c.country),
      regions: regions.map((r) => r.region),
    })
  } catch (err) {
    next(err)
  }
}