import { Router } from 'express'
import { authenticate, requireTeam } from '../../middleware/auth'
import {
  getRetentionWorkbench,
  recalcClientScore,
  getRetentionMetrics,
  getRetentionKanban,
  moveRetentionCard,
} from './retention.controller'

const router = Router()

router.get('/workbench', authenticate, requireTeam, getRetentionWorkbench)
router.get('/metrics', authenticate, requireTeam, getRetentionMetrics)
router.post('/recalc/:id', authenticate, requireTeam, recalcClientScore)

router.get('/kanban', authenticate, requireTeam, getRetentionKanban)
router.post('/kanban/:id/move', authenticate, requireTeam, moveRetentionCard)

export default router