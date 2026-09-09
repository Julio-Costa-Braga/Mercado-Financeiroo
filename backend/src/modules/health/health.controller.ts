import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { redis } from '../../config/redis'

// M26 - Observabilidade e Saúde

interface ServiceHealth {
  name: string
  status: 'up' | 'down' | 'degraded'
  latencyMs?: number
  detail?: string
}

export async function getHealthDashboard(_req: Request, res: Response, next: NextFunction) {
  try {
    const checks: ServiceHealth[] = []
    const started = Date.now()

    // API
    checks.push({ name: 'API', status: 'up', latencyMs: Date.now() - started })

    // Database
    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      checks.push({ name: 'Database', status: 'up', latencyMs: Date.now() - dbStart })
    } catch {
      checks.push({ name: 'Database', status: 'down' })
    }

    // Redis (opcional)
    if (redis) {
      try {
        const rStart = Date.now()
        await redis.ping()
        checks.push({ name: 'Redis', status: 'up', latencyMs: Date.now() - rStart })
      } catch {
        checks.push({ name: 'Redis', status: 'down' })
      }
    } else {
      checks.push({ name: 'Redis', status: 'degraded', detail: 'não configurado (opcional)' })
    }

    // WebSocket connections count
    const { io } = require('../../app') as any
    const wsConnections = io?.engine?.clientsCount ?? 0
    checks.push({ name: 'WebSocket', status: wsConnections > 0 ? 'up' : 'degraded', detail: `${wsConnections} conexões ativas` })

    // Market data
    try {
      const mStart = Date.now()
      const quoteCount = await prisma.quote.count()
      const lastQuote = await prisma.quote.findFirst({ orderBy: { updatedAt: 'desc' } })
      const fresh = lastQuote ? (Date.now() - lastQuote.updatedAt.getTime()) / 60000 : null
      checks.push({
        name: 'Market Data',
        status: 'up',
        latencyMs: Date.now() - mStart,
        detail: `${quoteCount} cotações · última há ${fresh !== null ? `${fresh.toFixed(1)} min` : '—'}`,
      })
    } catch {
      checks.push({ name: 'Market Data', status: 'down' })
    }

    // News
    try {
      const nStart = Date.now()
      const newsCount = await prisma.newsArticle.count()
      checks.push({ name: 'News', status: 'up', latencyMs: Date.now() - nStart, detail: `${newsCount} artigos` })
    } catch {
      checks.push({ name: 'News', status: 'down' })
    }

    // Macro
    try {
      const mcStart = Date.now()
      const macroCount = await prisma.economicIndicator.count()
      checks.push({ name: 'Macro', status: 'up', latencyMs: Date.now() - mcStart, detail: `${macroCount} indicadores` })
    } catch {
      checks.push({ name: 'Macro', status: 'down' })
    }

    // AI (sem key configurada -> degradado)
    const aiEnabled = !!(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY)
    checks.push({ name: 'AI', status: aiEnabled ? 'up' : 'degraded', detail: aiEnabled ? 'chave configurada' : 'chave não configurada (modo template)' })

    // Queue size / failed jobs
    checks.push({ name: 'Queue', status: 'up', detail: 'sem fila no MVP' })

    // Integrations health
    const integrations = await prisma.integrationConfig.findMany({
      select: { provider: true, type: true, status: true, lastSyncAt: true },
    })

    const overall = checks.every((c) => c.status === 'up')
      ? 'healthy'
      : checks.some((c) => c.status === 'down')
        ? 'degraded'
        : 'healthy'

    res.json({
      overall,
      timestamp: new Date().toISOString(),
      services: checks,
      integrations,
    })
  } catch (err) {
    next(err)
  }
}