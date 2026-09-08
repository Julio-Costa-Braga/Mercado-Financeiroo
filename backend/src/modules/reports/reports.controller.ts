import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'

// M21 - KPIs e Relatórios

export async function getKpis(req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date()
    const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1)

    // Retenção
    const [activeClients, churned, totalClients, reactivated30, atRisk] = await Promise.all([
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      prisma.client.count({ where: { status: 'CHURNED' } }),
      prisma.client.count(),
      prisma.retentionStatusHistory.count({ where: { to: 'ACTIVE', createdAt: { gte: monthAgo } } }),
      prisma.client.count({ where: { status: 'AT_RISK' } }),
    ])

    // Atendimento
    const [totalContacts, totalTasks, doneTasks, openTasks, recentContacts] = await Promise.all([
      prisma.clientContact.count(),
      prisma.task.count(),
      prisma.task.count({ where: { status: 'DONE' } }),
      prisma.task.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.clientContact.count({ where: { contactAt: { gte: monthAgo } } }),
    ])

    // Financeiro (view-only)
    const financial = await prisma.financialEvent.findMany()
    const ftd = financial.filter((e) => e.type === 'FTD' || e.type === 'INITIAL_DEPOSIT')
    const repeat = financial.filter((e) => e.type === 'REPEAT_DEPOSIT')
    const withdrawals = financial.filter((e) => e.type === 'WITHDRAWAL')
    const netDeposits = ftd.reduce((a, e) => a + e.amount, 0)
      + repeat.reduce((a, e) => a + e.amount, 0)
      - withdrawals.reduce((a, e) => a + e.amount, 0)

    // Por agente
    const agents = await prisma.user.findMany({
      where: { role: { in: ['RETENTION', 'SALES', 'MANAGER'] } },
      select: {
        id: true, name: true,
        _count: { select: { clients: true, tasks: true } },
      },
    })

    const agentKpis = await Promise.all(agents.map(async (a) => {
      const totalForAgent = await prisma.client.count({ where: { ownerId: a.id } })
      const churnedForAgent = await prisma.client.count({ where: { ownerId: a.id, status: 'CHURNED' } })
      const contactsForAgent = await prisma.clientContact.count({ where: { userId: a.id } })
      const completedForAgent = await prisma.task.count({ where: { ownerId: a.id, status: 'DONE' } })
      return {
        agent: a.name,
        contacts: contactsForAgent,
        activeClients: totalForAgent - churnedForAgent,
        churn: churnedForAgent,
        completedTasks: completedForAgent,
      }
    }))

    const retentionRate = totalClients > 0
      ? Math.round(((totalClients - churned) / totalClients) * 1000) / 10
      : 0

    res.json({
      retention: {
        activeClients,
        churned,
        total: totalClients,
        retentionRate,
        reactivated30,
        atRisk,
      },
      atendimento: {
        contacts: totalContacts,
        contacts30d: recentContacts,
        tasks: totalTasks,
        openTasks,
        doneTasks,
        completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 1000) / 10 : 0,
      },
      financeiro: {
        ftdCount: ftd.length,
        ftdTotal: ftd.reduce((a, e) => a + e.amount, 0),
        repeatDepositCount: repeat.length,
        repeatDepositTotal: repeat.reduce((a, e) => a + e.amount, 0),
        withdrawalCount: withdrawals.length,
        withdrawalTotal: withdrawals.reduce((a, e) => a + e.amount, 0),
        netDeposits,
      },
      agents: agentKpis,
    })
  } catch (err) {
    next(err)
  }
}