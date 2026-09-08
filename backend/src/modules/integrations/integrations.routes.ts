import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/auth'
import {
  getIntegrations,
  getHealthStatus,
  updateIntegration,
  createIntegration,
} from './integrations.controller'

const router = Router()

router.get('/', authenticate, getIntegrations)
router.get('/health', authenticate, getHealthStatus)
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), createIntegration)
router.put('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), updateIntegration)

export default router