import { Router } from 'express'
import { authenticate, requireModules } from '../../middleware/auth'
import { requireRole } from '../../middleware/auth'
import {
  getFinancialEvents,
  getClientFinancials,
  getFinancialDashboard,
  createFinancialEvent,
} from './deposits.controller'

const router = Router()

router.get('/', authenticate, requireModules('deposits'), getFinancialEvents)
router.get('/dashboard', authenticate, requireModules('deposits'), getFinancialDashboard)
router.get('/clients/:id', authenticate, requireModules('deposits'), getClientFinancials)
router.post('/', authenticate, requireModules('deposits'), requireRole('ADMIN', 'MANAGER'), createFinancialEvent)

export default router