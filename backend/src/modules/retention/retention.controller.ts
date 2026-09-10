import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { dispatch, EventTopics } from '../../config/events'
import { createNotification } from '../notifications/notifications.controller'

interface ScoreBreakdown {
  reason: string
  points: number
}

const STAGE_ORDER: Record<string, number> = {
  TICKET: 0,
  CONTACTED: 1,
  RECOVERY: 2,
  RECOVERED: 3,
  CHURNED: 4,
}

type StageKey = 'ticket' | 'contacted' | 'recovery' | 'recovered' | 'churned'

const STAGES: StageKey[] = ['ticket', 'contacted', 'recovery', 'recovered', 'churned']

function defaultStage(client: any, score: number): string {
  switch (client.status) {
    case 'CHURNED':
      return 'CHURNED'
    case 'PWM':
    case 'AT_RISK':
      return 'RECOVERY'
    case 'INACTIVE':
      return 'CONTACTED'
    case 'ACTIVE':
      return score >= 40 ? 'CONTACTED' : 'RECOVERED'
    default:
      return 'TICKET'
  }
}

function stageKeyFrom(stage: string): StageKey {
  return (stage || 'TICKET').toLowerCase() as StageKey
}

function computeBreakdown(client: any, events: any[]): { score: number; breakdown: ScoreBreakdown[] } {
  const breakdown: ScoreBreakdown[] = []
  let score = 0

  // Time without contact
  const noContactDays = client.lastContactAt
    ? Math.floor((Date.now() - client.lastContactAt.getTime()) / 86400000)
    : 30
  if (noContactDays >= 30) {
    const pts = Math.min(30, noContactDays)
    breakdown.push({ reason: `${noContactDays} dias sem contato`, points: pts })
    score += pts
  }

  // Low activity - few events
  if (events.length < 2) {
    breakdown.push({ reason: 'Baixa atividade', points: 20 })
    score += 20
  }

  // Withdrawal request
  const withdrawal = events.find((e) => e.type === 'WITHDRAWAL' || e.type === 'withdrawal')
  if (withdrawal) {
    breakdown.push({ reason: 'Pedido de levantamento', points: 20 })
    score += 20
  }

  // Low interaction
  const recentEvents = events.filter((e) => e.date > new Date(Date.now() - 14 * 86400000))
  if (recentEvents.length < 2) {
    breakdown.push({ reason: 'Baixa interação', points: 8 })
    score += 8
  }

  // Existing risk
  if (client.churnRisk > 0) {
    breakdown.push({ reason: 'Churn risk anterior', points: 10 })
    score += 10
  }

  return { score: Math.min(100, score), breakdown }
}

export async function getRetentionWorkbench(req: Request, res: Response, next: NextFunction) {
  try {
    const clients = await prisma.client.findMany({
      where: { status: { not: 'CHURNED' } },
      include: {
        events: { take: 5, orderBy: { date: 'desc' } },
        interests: true,
        owner: { select: { name: true } },
      },
    })

    const processed = clients.map((c) => {
      const { score, breakdown } = computeBreakdown(c, c.events)
      return {
        id: c.id,
        name: c.name,
        country: c.country,
        status: c.status,
        owner: c.owner?.name,
        priorityScore: score,
        breakdown,
      }
    })

    // Compute distribution
    const buckets = (level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW') =>
      processed.filter((c) => {
        if (level === 'CRITICAL') return c.priorityScore >= 80
        if (level === 'HIGH') return c.priorityScore >= 60 && c.priorityScore < 80
        if (level === 'MEDIUM') return c.priorityScore >= 40 && c.priorityScore < 60
        return c.priorityScore < 40
      })

    res.json({
      critical: buckets('CRITICAL'),
      high: buckets('HIGH'),
      medium: buckets('MEDIUM'),
      low: buckets('LOW'),
    })
  } catch (err) {
    next(err)
  }
}

export async function recalcClientScore(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const client = await prisma.client.findUnique({
      where: { id },
      include: { events: { take: 5, orderBy: { date: 'desc' } } },
    })
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })

    const { score, breakdown } = computeBreakdown(client, client.events)

    await Promise.all([
      prisma.client.update({ where: { id }, data: { priorityScore: score } }),
      prisma.retentionScore.create({
        data: { clientId: id, score, breakdown: breakdown as any },
      }),
    ])

    dispatch(EventTopics.RETENTION_SCORE_CHANGED, { clientId: id, score, breakdown })

    res.json({ score, breakdown })
  } catch (err) {
    next(err)
  }
}

export async function getRetentionMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const [active, churned, total, reactivated] = await Promise.all([
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      prisma.client.count({ where: { status: 'CHURNED' } }),
      prisma.client.count(),
      prisma.retentionStatusHistory.count({ where: { to: 'ACTIVE', createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
    ])

    const retentionRate = total > 0 ? Math.round(((total - churned) / total) * 100) : 0

    res.json({
      activeClients: active,
      churned: churned,
      total: total,
      retentionRate,
      reactivated: reactivated,
    })
  } catch (err) {
    next(err)
  }
}

// ============ KANBAN DE RETENÇÃO ============

export async function getRetentionKanban(req: Request, res: Response, next: NextFunction) {
  try {
    const clients = await prisma.client.findMany({
      orderBy: [{ retentionStage: 'asc' }, { priorityScore: 'desc' }],
      include: {
        events: { take: 5, orderBy: { date: 'desc' } },
        interests: true,
        tags: true,
        owner: { select: { name: true } },
        tasks: {
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          select: { id: true, title: true, priority: true, status: true },
        },
        alerts: { select: { id: true } },
        _count: { select: { tasks: true, notes: true } },
      },
    })

    const columns: Record<StageKey, any[]> = { ticket: [], contacted: [], recovery: [], recovered: [], churned: [] }

    for (const c of clients) {
      const { score, breakdown } = computeBreakdown(c, c.events)
      const stage = (c.retentionStage || defaultStage(c, score)) as string
      const riskLevel =
        score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW'
      const daysSinceContact = c.lastContactAt
        ? Math.floor((Date.now() - c.lastContactAt.getTime()) / 86400000)
        : null

      const card = {
        id: c.id,
        name: c.name,
        email: c.email,
        status: c.status,
        stage,
        owner: c.owner?.name ?? null,
        country: c.country,
        priorityScore: score,
        churnRisk: c.churnRisk,
        riskLevel,
        breakdown,
        lastContactAt: c.lastContactAt,
        daysSinceContact,
        lastEvent: c.events[0]
          ? { type: c.events[0].type, date: c.events[0].date }
          : null,
        interests: c.interests.map((i: any) => i.interest),
        openTasks: c.tasks,
        openTasksCount: c.tasks.length,
        alertsCount: c.alerts.length,
        riskProfile: c.riskProfile,
        clientType: c.clientType,
        objective: c.objective,
      }
      columns[stageKeyFrom(stage)]?.push(card)
    }

    res.json({
      columns,
      counts: Object.fromEntries(STAGES.map((s) => [s, columns[s].length])),
    })
  } catch (err) {
    next(err)
  }
}

export async function moveRetentionCard(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { toStage, reason } = req.body as { toStage?: string; reason?: string }
    if (!toStage || !(toStage in STAGE_ORDER)) {
      return res.status(400).json({ error: 'Stage de destino inválido' })
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true } } },
    })
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })

    const fromStage = (client.retentionStage || defaultStage(client, client.priorityScore)) as string
    if (fromStage === toStage) return res.json({ ok: true, stage: toStage })

    // Sincroniza status quando o card vira CHURNED ou RECOVERED
    const statusSync =
      toStage === 'CHURNED'
        ? { status: 'CHURNED' as const, churnRisk: Math.max(client.churnRisk, 80) }
        : toStage === 'RECOVERED'
          ? { status: 'ACTIVE' as const, churnRisk: Math.min(client.churnRisk, 20) }
          : client.status === 'CHURNED'
            ? ({ status: 'ACTIVE' as const } as any)
            : undefined

    await prisma.$transaction([
      prisma.client.update({
        where: { id },
        data: { retentionStage: toStage as any, ...(statusSync || {}) },
      }),
      prisma.retentionStatusHistory.create({
        data: {
          clientId: id,
          from: fromStage,
          to: toStage,
          reason: reason || null,
        },
      }),
      prisma.clientEvent.create({
        data: {
          clientId: id,
          type: 'RETENTION_STAGE_CHANGED',
          meta: { from: fromStage, to: toStage, reason: reason || '' },
        },
      }),
    ])

    // Notifica o dono do cliente (equipe)
    if (client.owner?.id) {
      await createNotification(
        client.owner.id,
        'CLIENT',
        `Retenção: ${client.name} → ${toStage}`,
        reason ? `Motivo: ${reason}` : `Movido de ${fromStage} para ${toStage}.`
      ).catch(() => {})
    }

    dispatch(EventTopics.CLIENT_UPDATED, { clientId: id, retentionStage: toStage, fromStage })

    res.json({ ok: true, fromStage, toStage })
  } catch (err) {
    next(err)
  }
}