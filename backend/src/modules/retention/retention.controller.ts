import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { dispatch, EventTopics } from '../../config/events'

interface ScoreBreakdown {
  reason: string
  points: number
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