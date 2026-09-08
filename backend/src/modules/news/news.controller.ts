import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'

export async function listNews(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      assetId, sector, region, country, impact, sentiment,
      search, page = '1', limit = '20',
    } = req.query as any

    const where: any = {}
    if (sector) where.sector = sector
    if (region) where.region = region
    if (country) where.country = country
    if (impact) where.impact = impact
    if (sentiment) where.sentiment = { gte: parseFloat(sentiment) }
    if (search) where.title = { contains: search, mode: 'insensitive' }
    if (assetId) where.assetLinks = { some: { assetId } }

    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20))

    const [total, news] = await Promise.all([
      prisma.newsArticle.count({ where }),
      prisma.newsArticle.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { publishedAt: 'desc' },
        include: {
          assetLinks: {
            include: { asset: { select: { ticker: true, name: true, type: true } } },
          },
        },
      }),
    ])

    res.json({ news, total })
  } catch (err) {
    next(err)
  }
}

export async function getNews(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const article = await prisma.newsArticle.findUnique({
      where: { id },
      include: {
        assetLinks: {
          include: { asset: { select: { id: true, ticker: true, name: true, sector: true } } },
        },
      },
    })
    res.json({ article })
  } catch (err) {
    next(err)
  }
}

// Resumo das últimas notícias para o dashboard / IA
export async function getLatestNews(req: Request, res: Response, next: NextFunction) {
  try {
    const news = await prisma.newsArticle.findMany({
      orderBy: { publishedAt: 'desc' },
      take: 20,
    })
    res.json({ news })
  } catch (err) {
    next(err)
  }
}