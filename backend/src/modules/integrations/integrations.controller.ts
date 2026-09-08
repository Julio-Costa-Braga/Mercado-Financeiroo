import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Errors } from '../../utils/errors'

// M23 - Integrações

export async function getIntegrations(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, provider } = req.query as any
    const where: any = {}
    if (type) where.type = type
    if (provider) where.provider = provider

    const integrations = await prisma.integrationConfig.findMany({
      where,
      orderBy: { provider: 'asc' },
    })

    const health = await prisma.integrationHealth.findMany({ orderBy: { lastCheckAt: 'desc' } })

    res.json({ integrations, health })
  } catch (err) {
    next(err)
  }
}

export async function updateIntegration(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { status, plan, config, lastSyncAt } = req.body

    const existing = await prisma.integrationConfig.findUnique({ where: { id } })
    if (!existing) throw Errors.notFound('Integração não encontrada')

    const integration = await prisma.integrationConfig.update({
      where: { id },
      data: {
        status: status || existing.status,
        plan: plan !== undefined ? plan : existing.plan,
        config: config !== undefined ? (config as any) : existing.config,
        lastSyncAt: lastSyncAt ? new Date(lastSyncAt as string) : existing.lastSyncAt,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'integration.updated',
        entity: 'IntegrationConfig',
        entityId: id,
        before: { status: existing.status },
        after: { status: integration.status },
      },
    })

    res.json({ integration })
  } catch (err) {
    next(err)
  }
}

export async function createIntegration(req: Request, res: Response, next: NextFunction) {
  try {
    const { provider, type, status, plan, config } = req.body
    const integration = await prisma.integrationConfig.create({
      data: { provider, type, status: status || 'ACTIVE', plan, config: config || undefined },
    })
    res.status(201).json({ integration })
  } catch (err) {
    next(err)
  }
}

export async function getHealthStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const health = await prisma.integrationHealth.findMany({
      orderBy: { provider: 'asc' },
    })
    res.json({ health })
  } catch (err) {
    next(err)
  }
}