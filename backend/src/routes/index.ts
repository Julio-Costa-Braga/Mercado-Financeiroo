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
import macroRoutes from '../modules/macro/macro.routes'
import calendarRoutes from '../modules/calendar/calendar.routes'
import depositsRoutes from '../modules/deposits/deposits.routes'
import aiRoutes from '../modules/ai/ai.routes'
import reportsRoutes from '../modules/reports/reports.routes'
import notificationsRoutes from '../modules/notifications/notifications.routes'
import integrationsRoutes from '../modules/integrations/integrations.routes'
import adminRoutes from '../modules/admin/admin.routes'
import auditRoutes from '../modules/audit/audit.routes'
import healthRoutes from '../modules/health/health.routes'
import portalRoutes from '../modules/portal/portal.routes'
import salesRoutes from '../modules/sales/sales.routes'

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
router.use('/macro', macroRoutes)
router.use('/calendar', calendarRoutes)
router.use('/deposits', depositsRoutes)
router.use('/ai', aiRoutes)
router.use('/reports', reportsRoutes)
router.use('/notifications', notificationsRoutes)
router.use('/integrations', integrationsRoutes)
router.use('/admin', adminRoutes)
router.use('/audit', auditRoutes)
router.use('/health', healthRoutes)
router.use('/portal', portalRoutes)
router.use('/sales', salesRoutes)

export default router