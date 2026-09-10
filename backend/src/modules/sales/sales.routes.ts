import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import {
  getSalesKanban,
  getSalesUsers,
  moveSalesCard,
  getSalesMetrics,
} from './sales.controller'

const router = Router()

router.get('/users', authenticate, requireRole('ADMIN', 'MANAGER', 'CRM'), getSalesUsers)
router.get('/kanban', authenticate, requireRole('ADMIN', 'MANAGER', 'CRM', 'SALES'), getSalesKanban)
router.post('/kanban/:id/move', authenticate, requireRole('ADMIN', 'MANAGER', 'CRM', 'SALES'), moveSalesCard)
router.get('/metrics', authenticate, requireRole('ADMIN', 'MANAGER', 'CRM', 'SALES'), getSalesMetrics)

export default router