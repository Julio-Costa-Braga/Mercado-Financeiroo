import { Router } from 'express'
import authRoutes from '../modules/auth/auth.routes'
import marketRoutes from '../modules/market/market.routes'
import clientsRoutes from '../modules/clients/clients.routes'
import retentionRoutes from '../modules/retention/retention.routes'
import tasksRoutes from '../modules/tasks/tasks.routes'
import watchlistRoutes from '../modules/watchlist/watchlist.routes'
import alertsRoutes from '../modules/alerts/alerts.routes'
import newsRoutes from '../modules/news/news.routes'
import dashboardRoutes from '../modules/dashboard/dashboard.routes'
import screenerRoutes from '../modules/screener/screener.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/market', marketRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/clients', clientsRoutes)
router.use('/retention', retentionRoutes)
router.use('/tasks', tasksRoutes)
router.use('/watchlists', watchlistRoutes)
router.use('/alerts', alertsRoutes)
router.use('/news', newsRoutes)
router.use('/screener', screenerRoutes)

export default router