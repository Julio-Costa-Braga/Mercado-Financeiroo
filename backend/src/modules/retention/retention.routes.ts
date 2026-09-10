import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import {
  getRetentionWorkbench,
  recalcClientScore,
  getRetentionMetrics,
  getRetentionKanban,
  moveRetentionCard,
} from './retention.controller'

const router = Router()

const MAINTAINERS = ['ADMIN', 'MANAGER', 'CRM', 'RETENTION']

router.get('/workbench', authenticate, requireRole(...MAINTAINERS), getRetentionWorkbench)
router.get('/metrics', authenticate, requireRole(...MAINTAINERS), getRetentionMetrics)
router.post('/recalc/:id', authenticate, requireRole(...MAINTAINERS), recalcClientScore)

router.get('/kanban', authenticate, requireRole(...MAINTAINERS), getRetentionKanban)
router.post('/kanban/:id/move', authenticate, requireRole(...MAINTAINERS), moveRetentionCard)

export default router