import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Errors } from '../../utils/errors'

// M19 - Depositos e Movimentações
// MVP: apenas leitura de eventos financeiros (sem custódia própria).

export async function getFinancialEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId, type, from, to, page = '1', limit = '50' } = req.query as any

    const where: any = {}
    if (clientId) where.clientId = clientId
    if (type) where.type = type
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from as string)
      if (to) where.date.lte = new Date(to as string)
    }

    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))

    const [total, events] = await Promise.all([
      prisma.financialEvent.count({ where }),
      prisma.financialEvent.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: { client: { select: { id: true, name: true } } },
      }),
    ])

    res.json({ events, total })
  } catch (err) {
    next(err)
  }
}

export async function getClientFinancials(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const events = await prisma.financialEvent.findMany({
      where: { clientId: id },
      orderBy: { date: 'desc' },
      take: 100,
    })
    res.json({ events })
  } catch (err) {
    next(err)
  }
}

// Dashboard financeiro consolidado (view-only)
export async function getFinancialDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const events = await prisma.financialEvent.findMany()

    const byType = (t: string) => events.filter((e) => e.type === t)
    const summarize = (list: typeof events) => ({
      count: list.length,
      total: list.reduce((a, e) => a + e.amount, 0),
    })

    const initial = byType('INITIAL_DEPOSIT')
    const repeat = byType('REPEAT_DEPOSIT')
    const ftd = byType('FTD')
    const withdrawals = byType('WITHDRAWAL')
    const deposits = [...initial, ...repeat, ...ftd]

    res.json({
      initialDeposits: summarize(initial),
      repeatDeposits: summarize(repeat),
      withdrawals: summarize(withdrawals),
      ftd: summarize(ftd),
      netDeposits: {
        count: deposits.length - withdrawals.length,
        total: deposits.reduce((a, e) => a + e.amount, 0) - withdrawals.reduce((a, e) => a + e.amount, 0),
      },
      recent: events.slice(0, 20),
    })
  } catch (err) {
    next(err)
  }
}

// Registrar evento financeiro (apenas ingestão autorizada pela integração)
export async function createFinancialEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId, type, amount, currency, date, meta } = req.body
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) throw Errors.notFound('Cliente não encontrado')

    const event = await prisma.financialEvent.create({
      data: {
        clientId,
        type,
        amount,
        currency: currency || 'USD',
        date: date ? new Date(date) : new Date(),
        meta: meta || undefined,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'financial.event.created',
        entity: 'FinancialEvent',
        entityId: event.id,
      },
    })

    res.status(201).json({ event })
  } catch (err) {
    next(err)
  }
}