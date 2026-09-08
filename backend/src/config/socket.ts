import { Server } from 'socket.io'
import { verifyToken } from '../utils/jwt'
import { prisma } from './prisma'
import { logger } from './logger'
import { events, EventTopics } from './events'

// Encaminha eventos do barramento de domínio para os clientes via Socket.IO
function wireDomainEvents(io: Server) {
  const forward = (topic: string) => {
    events.on(topic, (evt: any) => {
      const { payload } = evt
      switch (topic) {
        case EventTopics.QUOTE_UPDATED: {
          const symbol = payload.symbol as string
          io.to(`market:${symbol}`).emit('market:quote', payload)
          io.emit('market:quotes', payload)
          break
        }
        case EventTopics.BAR_UPDATED:
          io.to(`market:${(payload as any).symbol}`).emit('market:bar', payload)
          break
        case EventTopics.NEWS_RECEIVED:
          io.emit('news:received', payload)
          break
        case EventTopics.ALERT_TRIGGERED:
          io.to(`user:${payload.userId}`).emit('alert:triggered', payload)
          break
        case EventTopics.RETENTION_SCORE_CHANGED: {
          const clientId = payload.clientId as string
          io.emit(`retention:${clientId}`, payload)
          break
        }
        case EventTopics.CLIENT_UPDATED:
          io.emit(`client:${payload.id}`, payload)
          break
        case EventTopics.TASK_CREATED: {
          const task = payload as any
          if (task.ownerId) io.to(`user:${task.ownerId}`).emit('task:created', payload)
          break
        }
        case EventTopics.FINANCIAL_EVENT_CREATED:
          io.emit('financial:event', payload)
          break
      }
    })
  }

  Object.values(EventTopics).forEach(forward)
}

export function setupSocket(io: Server) {
  wireDomainEvents(io)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Token não fornecido'))
      const payload = verifyToken(token)
      const session = await prisma.session.findUnique({ where: { id: payload.sessionId } })
      if (!session || session.revokedAt) return next(new Error('Sessão inválida'))
      socket.data.user = payload
      next()
    } catch (err) {
      next(new Error('Não autorizado'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.user?.userId
    logger.info(`Socket connected: user ${userId}`)

    // Join user room for personal notifications
    if (userId) socket.join(`user:${userId}`)

    // Allow subscribing to market channels
    socket.on('subscribe:market', (channels: string[]) => {
      channels.forEach((ch) => socket.join(`market:${ch}`))
    })

    socket.on('unsubscribe:market', (channels: string[]) => {
      channels.forEach((ch) => socket.leave(`market:${ch}`))
    })

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: user ${userId}`)
    })
  })
}