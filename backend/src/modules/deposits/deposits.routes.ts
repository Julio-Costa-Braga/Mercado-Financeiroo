import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/auth'
import {
  getFinancialEvents,
  getClientFinancials,
  getFinancialDashboard,
  createFinancialEvent,
} from './deposits.controller'

const router = Router()

router.get('/', authenticate, getFinancialEvents)
router.get('/dashboard', authenticate, getFinancialDashboard)
router.get('/clients/:id', authenticate, getClientFinancials)
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), createFinancialEvent)

export default router