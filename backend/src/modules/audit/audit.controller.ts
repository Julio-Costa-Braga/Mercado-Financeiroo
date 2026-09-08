import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'

// M25 - Auditoria e Compliance

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      userId, action, entity, entityId,
      search, from, to,
      page = '1', limit = '50',
    } = req.query as any

    const where: any = {}
    if (userId) where.userId = userId
    if (action) where.action = { contains: action, mode: 'insensitive' }
    if (entity) where.entity = entity
    if (entityId) where.entityId = entityId
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from as string)
      if (to) where.createdAt.lte = new Date(to as string)
    }
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
      ]
    }

    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50))

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ])

    res.json({ logs, total })
  } catch (err) {
    next(err)
  }
}