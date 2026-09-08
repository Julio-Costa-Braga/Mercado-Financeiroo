import { app, server } from './app'
import { logger } from './config/logger'

const PORT = process.env.PORT || 4000

server.listen(PORT, () => {
  logger.info(`API rodando em http://localhost:${PORT}`)
  logger.info(`Health check: http://localhost:${PORT}/health`)
})