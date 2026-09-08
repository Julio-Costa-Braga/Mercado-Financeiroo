import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Errors } from '../../utils/errors'

export async function listAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, type, clientId, assetId } = req.query as any
    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type
    if (clientId) where.clientId = clientId
    if (assetId) where.assetId = assetId

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        asset: { select: { id: true, ticker: true, name: true } },
        deliveries: true,
      },
    })
    res.json({ alerts })
  } catch (err) {
    next(err)
  }
}

export async function createAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, condition, threshold, assetId, clientId } = req.body
    const alert = await prisma.alert.create({
      data: {
        type,
        condition,
        threshold,
        assetId,
        clientId,
        userId: req.user!.id,
      },
    })
    res.status(201).json({ alert })
  } catch (err) {
    next(err)
  }
}

export async function updateAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { status, condition, threshold } = req.body
    const existing = await prisma.alert.findUnique({ where: { id } })
    if (!existing) throw Errors.notFound('Alerta não encontrado')

    const alert = await prisma.alert.update({
      where: { id },
      data: { status, condition, threshold },
    })
    res.json({ alert })
  } catch (err) {
    next(err)
  }
}

export async function deleteAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    await prisma.alert.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function markAlertRead(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    await prisma.alertDelivery.updateMany({
      where: { id, readAt: null },
      data: { readAt: new Date() },
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}