import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { Server } from 'socket.io'
import http from 'http'
import { errorHandler, notFound } from './middleware/error'
import { logger } from './config/logger'
import apiRouter from './routes/index'
import { setupSocket } from './config/socket'

const app = express()
const server = http.createServer(app)

// Socket.io setup
export const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'] },
})
setupSocket(io)

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
)
app.use(express.json({ limit: '2mb' }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', limiter)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/v1', apiRouter)

// Errors
app.use(notFound)
app.use(errorHandler)

export { app, server }