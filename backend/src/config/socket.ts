import { Server } from 'socket.io'
import { verifyToken } from '../utils/jwt'
import { prisma } from './prisma'
import { logger } from './logger'

export function setupSocket(io: Server) {
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