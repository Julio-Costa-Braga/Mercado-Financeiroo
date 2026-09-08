import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'

// M22 - Notificações (In-App no MVP; Web Push/Email depois)

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const { unread = 'false', page = '1', limit = '50' } = req.query as any
    const where: any = { userId: req.user!.id }
    if (unread === 'true') where.readAt = null

    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))

    const [total, notifications, unreadCount] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.notification.count({ where: { userId: req.user!.id, readAt: null } }),
    ])

    res.json({ notifications, total, unreadCount })
  } catch (err) {
    next(err)
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    await prisma.notification.updateMany({
      where: { id, userId: req.user!.id },
      data: { readAt: new Date() },
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

// Criação interna de notificação (usada por outros módulos)
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body?: string
) {
  return prisma.notification.create({ data: { userId, type, title, body } })
}