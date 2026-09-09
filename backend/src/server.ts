import { app, server } from './app'
import { logger } from './config/logger'
import { startMarketUpdater } from './modules/market/marketData.service'

const PORT = (process.env.PORT as string) || '4000'
const HOST = process.env.HOST || '0.0.0.0'

server.listen(Number(PORT), HOST, () => {
  logger.info(`API rodando em http://localhost:${PORT}`)
  logger.info(`Health check: http://localhost:${PORT}/health`)
  startMarketUpdater()
})