import { Router } from 'express'
import { authenticate, requireRole, requireModules } from '../../middleware/auth'
import {
  getSalesKanban,
  getSalesUsers,
  moveSalesCard,
  getSalesMetrics,
} from './sales.controller'

const router = Router()

router.get('/users', authenticate, requireModules('sales'), requireRole('ADMIN', 'MANAGER', 'CRM'), getSalesUsers)
router.get('/kanban', authenticate, requireModules('sales'), requireRole('ADMIN', 'MANAGER', 'CRM', 'SALES'), getSalesKanban)
router.post('/kanban/:id/move', authenticate, requireModules('sales'), requireRole('ADMIN', 'MANAGER', 'CRM', 'SALES'), moveSalesCard)
router.get('/metrics', authenticate, requireModules('sales'), requireRole('ADMIN', 'MANAGER', 'CRM', 'SALES'), getSalesMetrics)

export default router