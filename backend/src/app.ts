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

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'https://mercado-financeiroo.onrender.com',
  'https://mercado-financeiroo.vercel.app',
  'https://mercado-financeiro.vercel.app',
]

function getAllowedOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  return Array.from(new Set([...fromEnv, ...DEFAULT_ORIGINS]))
}

// Socket.io setup
export const io = new Server(server, {
  cors: { origin: getAllowedOrigins() },
})
setupSocket(io)

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: getAllowedOrigins(),
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