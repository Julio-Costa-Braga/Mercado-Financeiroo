import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Errors } from '../../utils/errors'

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      status, type, clientId, ownerId, priority, search,
      page = '1', limit = '50', mine = 'false', today = 'false',
    } = req.query as any

    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type
    if (clientId) where.clientId = clientId
    if (priority) where.priority = priority
    if (ownerId) where.ownerId = ownerId
    if (mine === 'true') where.ownerId = req.user!.id
    if (today === 'true') {
      const start = new Date(); start.setHours(0, 0, 0, 0)
      const end = new Date(); end.setHours(23, 59, 59, 999)
      where.dueAt = { gte: start, lte: end }
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: [
          { status: 'asc' },
          { dueAt: 'asc' },
        ],
        include: {
          client: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        },
      }),
    ])

    res.json({ tasks, total })
  } catch (err) {
    next(err)
  }
}

export async function getTasksToday(req: Request, res: Response, next: NextFunction) {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const end = new Date(); end.setHours(23, 59, 59, 999)

    const tasks = await prisma.task.findMany({
      where: {
        dueAt: { gte: start, lte: end },
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      orderBy: { priority: 'asc' },
      include: {
        client: { select: { name: true } },
        owner: { select: { name: true } },
      },
    })

    res.json({ tasks })
  } catch (err) {
    next(err)
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, clientId, ownerId, type, priority, dueAt, notes } = req.body
    const task = await prisma.task.create({
      data: {
        title,
        clientId,
        ownerId: ownerId || req.user!.id,
        type,
        priority: priority || 'MEDIUM',
        dueAt: dueAt ? new Date(dueAt) : undefined,
        notes,
      },
      include: {
        client: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    })
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'task.created', entity: 'Task', entityId: task.id },
    })
    res.status(201).json({ task })
  } catch (err) {
    next(err)
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { title, status, priority, dueAt, result, notes, ownerId, type } = req.body

    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) throw Errors.notFound('Tarefa não encontrada')

    const task = await prisma.task.update({
      where: { id },
      data: { title, status, priority, dueAt: dueAt ? new Date(dueAt) : undefined, result, notes, ownerId, type },
      include: {
        client: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    })

    if (status && status !== existing.status) {
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: `task.${status === 'DONE' ? 'completed' : status === 'IN_PROGRESS' ? 'started' : 'updated'}`,
          entity: 'Task',
          entityId: id,
          before: { status: existing.status },
          after: { status },
        },
      })
    }

    res.json({ task })
  } catch (err) {
    next(err)
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    await prisma.task.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}