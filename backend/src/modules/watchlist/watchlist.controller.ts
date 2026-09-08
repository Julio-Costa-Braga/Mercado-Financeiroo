import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Errors } from '../../utils/errors'

export async function getWatchlists(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId, userId } = req.query as any
    const where: any = {}
    if (clientId) where.clientId = clientId
    else if (userId) where.userId = userId
    else where.OR = [{ userId: req.user!.id }, { isGlobal: true }]

    const watchlists = await prisma.watchlist.findMany({
      where,
      include: {
        assets: {
          orderBy: { order: 'asc' },
          include: {
            asset: {
              select: {
                id: true,
                ticker: true,
                name: true,
                type: true,
                sector: true,
                quotes: { take: 1, orderBy: { updatedAt: 'desc' } },
              },
            },
          },
        },
      },
    })

    const result = watchlists.map((wl) => ({
      ...wl,
      assets: wl.assets.map((a) => ({
        ...a,
        asset: {
          ...a.asset,
          quotes: a.asset.quotes.map((q) => ({
            price: q.price,
            changePct1D: q.changePct1D,
          })),
        },
      })),
    }))
    res.json({ watchlists: result })
  } catch (err) {
    next(err)
  }
}

export async function createWatchlist(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, clientId, userId, isGlobal } = req.body
    const watchlist = await prisma.watchlist.create({
      data: {
        name: name || 'Watchlist',
        clientId,
        userId: userId || req.user!.id,
        isGlobal: isGlobal || false,
      },
    })
    res.status(201).json({ watchlist })
  } catch (err) {
    next(err)
  }
}

export async function addAsset(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { assetId, groupName } = req.body

    const existing = await prisma.watchlistAsset.findUnique({
      where: { watchlistId_assetId: { watchlistId: id, assetId } },
    })
    if (existing) throw Errors.conflict('Ativo já está na watchlist')

    const count = await prisma.watchlistAsset.count({ where: { watchlistId: id } })
    await prisma.watchlistAsset.create({
      data: { watchlistId: id, assetId, groupName, order: count },
    })
    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function removeAsset(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, assetId } = req.params
    await prisma.watchlistAsset.deleteMany({ where: { watchlistId: id, assetId } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function reorderAssets(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { assetIds } = req.body

    await prisma.$transaction(
      assetIds.map((assetId: string, index: number) =>
        prisma.watchlistAsset.updateMany({
          where: { watchlistId: id, assetId },
          data: { order: index },
        })
      )
    )
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}