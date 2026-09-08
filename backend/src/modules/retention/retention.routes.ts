import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import {
  getRetentionWorkbench,
  recalcClientScore,
  getRetentionMetrics,
} from './retention.controller'

const router = Router()

router.get('/workbench', authenticate, getRetentionWorkbench)
router.get('/metrics', authenticate, getRetentionMetrics)
router.post('/recalc/:id', authenticate, recalcClientScore)

export default router