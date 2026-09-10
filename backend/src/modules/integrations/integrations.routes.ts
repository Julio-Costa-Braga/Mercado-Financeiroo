import { Router } from 'express'
import { authenticate, requireModules } from '../../middleware/auth'
import { requireRole } from '../../middleware/auth'
import {
  getIntegrations,
  getHealthStatus,
  updateIntegration,
  createIntegration,
} from './integrations.controller'

const router = Router()

router.get('/', authenticate, requireModules('integrations'), getIntegrations)
router.get('/health', authenticate, requireModules('integrations'), getHealthStatus)
router.post('/', authenticate, requireModules('integrations'), requireRole('ADMIN', 'MANAGER'), createIntegration)
router.put('/:id', authenticate, requireModules('integrations'), requireRole('ADMIN', 'MANAGER'), updateIntegration)

export default router