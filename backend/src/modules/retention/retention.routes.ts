import { Router } from 'express'
import { authenticate, requireRole, requireModules } from '../../middleware/auth'
import {
  getRetentionWorkbench,
  recalcClientScore,
  getRetentionMetrics,
  getRetentionKanban,
  moveRetentionCard,
} from './retention.controller'

const router = Router()

const MAINTAINERS = ['ADMIN', 'MANAGER', 'CRM', 'RETENTION']

router.get('/workbench', authenticate, requireRole(...MAINTAINERS), requireModules('retention'), getRetentionWorkbench)
router.get('/metrics', authenticate, requireRole(...MAINTAINERS), requireModules('retention'), getRetentionMetrics)
router.post('/recalc/:id', authenticate, requireRole(...MAINTAINERS), requireModules('retention'), recalcClientScore)

router.get('/kanban', authenticate, requireRole(...MAINTAINERS), requireModules('retention'), getRetentionKanban)
router.post('/kanban/:id/move', authenticate, requireRole(...MAINTAINERS), requireModules('retention'), moveRetentionCard)

export default router