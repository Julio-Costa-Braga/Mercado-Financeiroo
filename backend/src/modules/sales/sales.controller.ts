import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Errors } from '../../utils/errors'
import { dispatch, EventTopics } from '../../config/events'
import { createNotification } from '../notifications/notifications.controller'

const DEPOSIT_TYPES = ['DEPOSIT', 'INITIAL_DEPOSIT', 'REPEAT_DEPOSIT', 'FTD']

const SALES_STAGES = ['CRM_BASE', 'ASSIGNED', 'CONTACTED', 'DEPOSITED', 'RETENTION', 'LOST']
const GATEWAY_ROLES = ['ADMIN', 'MANAGER', 'CRM']
const SELLER_MOVES = ['CONTACTED', 'DEPOSITED', 'LOST']
const GATEWAY_MOVES = ['CRM_BASE', 'ASSIGNED', 'CONTACTED', 'RETENTION', 'LOST']

export async function getSalesUsers(req: Request, res: Response, next: NextFunction) {
  try {
    if (!GATEWAY_ROLES.includes(req.user!.role)) throw Errors.forbidden()
    const role = req.query.role as string | undefined
    const where = role && (role === 'SALES' || role === 'RETENTION') ? { role: role as any } : undefined
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    })
    res.json({ users })
  } catch (err) {
    next(err)
  }
}

export async function getSalesKanban(req: Request, res: Response, next: NextFunction) {
  try {
    const me = req.user!
    const isGateway = GATEWAY_ROLES.includes(me.role)
    const isSeller = me.role === 'SALES'
    if (!isGateway && !isSeller) throw Errors.forbidden()

    const where: any = {}
    if (isSeller) where.ownerId = me.id

    const clients = await prisma.client.findMany({
      where,
      orderBy: [{ salesStage: 'asc' }, { updatedAt: 'desc' }],
      include: {
        interests: true,
        owner: { select: { id: true, name: true } },
        soldBy: { select: { id: true, name: true } },
        events: { take: 3, orderBy: { date: 'desc' } },
      },
    })

    const columns: Record<string, any[]> = Object.fromEntries(SALES_STAGES.map((s) => [s, []]))

    for (const c of clients) {
      const hasDeposit = c.events.some((e: any) => DEPOSIT_TYPES.includes(e.type))
      columns[c.salesStage]?.push({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        country: c.country,
        status: c.status,
        stage: c.salesStage,
        ownerId: c.ownerId,
        owner: c.owner?.name ?? null,
        soldBy: c.soldBy?.name ?? null,
        soldAt: c.soldAt,
        sentToCrmAt: c.sentToCrmAt,
        firstDepositValue: c.firstDepositValue,
        refundedAt: c.refundedAt,
        salesLostReason: c.salesLostReason,
        retentionStage: c.retentionStage,
        churnRisk: c.churnRisk,
        priorityScore: c.priorityScore,
        lastContactAt: c.lastContactAt,
        hasDeposit,
        lastEvent: c.events[0] ? { type: c.events[0].type, date: c.events[0].date } : null,
        interests: c.interests.map((i: any) => i.interest),
      })
    }

    let users: any[] | undefined
    if (isGateway) {
      const sales = await prisma.user.findMany({
        where: { role: 'SALES', status: 'ACTIVE' },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      })
      const retention = await prisma.user.findMany({
        where: { role: 'RETENTION', status: 'ACTIVE' },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      })
      users = [
        ...sales.map((u) => ({ ...u, group: 'SALES' })),
        ...retention.map((u) => ({ ...u, group: 'RETENTION' })),
      ]
    }

    res.json({
      columns,
      counts: Object.fromEntries(SALES_STAGES.map((s) => [s, columns[s].length])),
      users,
      view: isSeller ? 'seller' : 'gateway',
    })
  } catch (err) {
    next(err)
  }
}

async function resolveAssignee(assigneeId?: string, expectedRole?: string) {
  if (!assigneeId) throw Errors.badRequest('Selecione o colaborador responsável')
  const user = await prisma.user.findUnique({ where: { id: assigneeId } })
  if (!user || user.status !== 'ACTIVE') throw Errors.notFound('Colaborador não encontrado')
  if (expectedRole && user.role !== expectedRole) {
    throw Errors.badRequest(`O colaborador deve ter o papel ${expectedRole}`)
  }
  return user
}

export async function moveSalesCard(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { toStage, assigneeId, reason } = req.body as {
      toStage?: string
      assigneeId?: string
      reason?: string
    }
    if (!toStage || !SALES_STAGES.includes(toStage)) {
      throw Errors.badRequest('Estágio de destino inválido')
    }

    const me = req.user!
    const isGateway = GATEWAY_ROLES.includes(me.role)

    if (!isGateway && me.role !== 'SALES') throw Errors.forbidden()
    if (me.role === 'SALES') {
      if (!SELLER_MOVES.includes(toStage)) throw Errors.forbidden('Ação não permitida para vendedores')
    } else if (!GATEWAY_MOVES.includes(toStage)) {
      throw Errors.forbidden('Ação não permitida para o CRM')
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true } } },
    })
    if (!client) throw Errors.notFound('Cliente não encontrado')

    if (me.role === 'SALES' && client.ownerId !== me.id) {
      throw Errors.forbidden('Você só pode mover cards do seu próprio pipeline')
    }
    if (client.salesStage === toStage && toStage !== 'DEPOSITED') {
      return res.json({ ok: true, fromStage: client.salesStage, toStage })
    }

    let data: any = {}
    let eventType = 'SALES_STAGE_CHANGED'
    let eventMeta: any = { from: client.salesStage, to: toStage, reason: reason || '' }
    let notifyUserId: string | null = null

    if (me.role === 'SALES') {
      if (toStage === 'CONTACTED') {
        data = { salesStage: 'CONTACTED' }
      } else if (toStage === 'DEPOSITED') {
        const firstDeposit = await prisma.financialEvent.findFirst({
          where: { clientId: id, type: { in: DEPOSIT_TYPES } },
          orderBy: { date: 'asc' },
        })
        data = {
          salesStage: 'DEPOSITED',
          soldById: me.id,
          soldAt: new Date(),
          sentToCrmAt: new Date(),
          firstDepositValue: firstDeposit?.amount ?? null,
          ownerId: null,
          refundedAt: null,
          salesLostReason: null,
        }
        eventType = 'SALES_DEPOSITED'
        eventMeta = { value: firstDeposit?.amount ?? null }
      } else if (toStage === 'LOST') {
        data = {
          salesStage: 'LOST',
          refundedAt: new Date(),
          salesLostReason: reason || null,
        }
        eventType = 'SALES_LOST'
        eventMeta = { reason: reason || '' }
      }
    } else {
      if (toStage === 'ASSIGNED' || toStage === 'CONTACTED') {
        const assignee = await resolveAssignee(assigneeId, 'SALES')
        data = {
          salesStage: toStage,
          ownerId: assignee.id,
          refundedAt: null,
          salesLostReason: null,
        }
        eventType = 'SALES_ASSIGNED'
        eventMeta = { assignee: assignee.name, to: toStage }
        notifyUserId = assignee.id
      } else if (toStage === 'RETENTION') {
        const assignee = await resolveAssignee(assigneeId, 'RETENTION')
        data = {
          salesStage: 'RETENTION',
          ownerId: assignee.id,
          retentionStage: 'TICKET',
          status: 'ACTIVE',
          refundedAt: null,
          salesLostReason: null,
        }
        eventType = 'RETENTION_STARTED'
        eventMeta = { assignee: assignee.name }
        notifyUserId = assignee.id
      } else if (toStage === 'LOST') {
        data = {
          salesStage: 'LOST',
          refundedAt: new Date(),
          salesLostReason: reason || null,
          ownerId: null,
        }
        eventType = 'SALES_LOST'
        eventMeta = { reason: reason || '' }
      } else if (toStage === 'CRM_BASE') {
        data = { salesStage: 'CRM_BASE', ownerId: null }
        eventType = 'SALES_BASE'
      }
    }

    await prisma.$transaction([
      prisma.client.update({ where: { id }, data }),
      prisma.clientEvent.create({
        data: { clientId: id, type: eventType, meta: eventMeta },
      }),
      prisma.auditLog.create({
        data: {
          userId: me.id,
          action: `sales.${eventType.toLowerCase()}`,
          entity: 'Client',
          entityId: id,
        },
      }),
    ])

    if (notifyUserId) {
      await createNotification(
        notifyUserId,
        'CLIENT',
        `Nova responsabilidade: ${client.name}`,
        `Card movido para ${toStage}.`
      ).catch(() => {})
    }

    dispatch(EventTopics.CLIENT_UPDATED, {
      clientId: id,
      salesStage: data.salesStage,
      fromStage: client.salesStage,
    })

    res.json({ ok: true, fromStage: client.salesStage, toStage: data.salesStage || toStage })
  } catch (err) {
    next(err)
  }
}

// Handoff automatico: quando um deposito e registrado para um cliente em
// pipeline de vendas, o card sai do vendedor e volta para a base do CRM.
export async function autoSettleDeposit(clientId: string, amount: number, _currency?: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client || (client.salesStage !== 'ASSIGNED' && client.salesStage !== 'CONTACTED')) {
    return { settled: false }
  }
  const sellerId = client.ownerId
  await prisma.$transaction([
    prisma.client.update({
      where: { id: clientId },
      data: {
        salesStage: 'DEPOSITED',
        soldById: sellerId || undefined,
        soldAt: new Date(),
        sentToCrmAt: new Date(),
        firstDepositValue: amount,
        ownerId: null,
        refundedAt: null,
        salesLostReason: null,
      },
    }),
    prisma.clientEvent.create({
      data: {
        clientId,
        type: 'SALES_DEPOSITED',
        meta: { value: amount, auto: true },
      },
    }),
  ])
  dispatch(EventTopics.CLIENT_UPDATED, { clientId, salesStage: 'DEPOSITED' })
  return { settled: true }
}

function summarizeSeller(clients: any[], seller: any) {
  const sold = clients.filter((c) => c.soldById === seller.id)
  const saleValue = sold.reduce((a, c) => a + (c.firstDepositValue || 0), 0)
  const refunded = sold.filter((c) => c.refundedAt)
  const pipeline = clients.filter(
    (c) => c.ownerId === seller.id && (c.salesStage === 'ASSIGNED' || c.salesStage === 'CONTACTED')
  )

  const stageCounts: Record<string, number> = {
    CRM_BASE: 0,
    ASSIGNED: 0,
    CONTACTED: 0,
    DEPOSITED: 0,
    RETENTION: 0,
    LOST: 0,
  }
  for (const s of sold) {
    if (s.salesStage in stageCounts) stageCounts[s.salesStage] += 1
  }

  return {
    sellerId: seller.id,
    name: seller.name,
    email: seller.email,
    soldCount: sold.length,
    salesValue: saleValue,
    refundedCount: refunded.length,
    refundedValue: refunded.reduce((a, c) => a + (c.firstDepositValue || 0), 0),
    sentToCrmCount: sold.filter((c) => c.sentToCrmAt).length,
    routedRetentionCount: sold.filter(
      (c) => c.salesStage === 'RETENTION' || c.retentionStage
    ).length,
    pipelineCount: pipeline.length,
    stageCounts,
  }
}

export async function getSalesMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const me = req.user!
    const isGateway = GATEWAY_ROLES.includes(me.role)
    const querySellerId = req.query.sellerId as string | undefined

    if (!isGateway && me.role !== 'SALES') throw Errors.forbidden()
    const sellerId = me.role === 'SALES' ? me.id : querySellerId

    const clients = await prisma.client.findMany({
      where: sellerId
        ? { OR: [{ soldById: sellerId }, { ownerId: sellerId }] }
        : {},
      select: {
        id: true,
        name: true,
        salesStage: true,
        retentionStage: true,
        soldById: true,
        ownerId: true,
        soldAt: true,
        sentToCrmAt: true,
        firstDepositValue: true,
        refundedAt: true,
        status: true,
      },
    })

    if (!isGateway || querySellerId) {
      if (!sellerId) throw Errors.badRequest('sellerId é obrigatório')
      const seller = await prisma.user.findUnique({ where: { id: sellerId } })
      if (!seller) throw Errors.notFound('Vendedor não encontrado')

      const metrics = summarizeSeller(clients, seller)
      const recent = await prisma.client.findMany({
        where: { soldById: sellerId },
        orderBy: { soldAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          soldAt: true,
          sentToCrmAt: true,
          firstDepositValue: true,
          refundedAt: true,
          salesStage: true,
          status: true,
        },
      })

      res.json({
        scope: 'seller',
        seller: { id: seller.id, name: seller.name, email: seller.email },
        metrics,
        recent,
      })
      return
    }

    // Visao do CRM: agrega todos os vendedores
    const sellers = await prisma.user.findMany({
      where: { role: 'SALES', status: 'ACTIVE' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    })
    const breakdown = sellers.map((s) => summarizeSeller(clients, s))
    const totals = breakdown.reduce(
      (acc: Record<string, number>, row) => {
        acc.soldCount += row.soldCount
        acc.salesValue += row.salesValue
        acc.refundedCount += row.refundedCount
        acc.refundedValue += row.refundedValue
        acc.sentToCrmCount += row.sentToCrmCount
        acc.routedRetentionCount += row.routedRetentionCount
        acc.pipelineCount += row.pipelineCount
        return acc
      },
      {
        soldCount: 0,
        salesValue: 0,
        refundedCount: 0,
        refundedValue: 0,
        sentToCrmCount: 0,
        routedRetentionCount: 0,
        pipelineCount: 0,
      }
    )

    res.json({
      scope: 'crm',
      sellers: breakdown,
      totals,
    })
  } catch (err) {
    next(err)
  }
}