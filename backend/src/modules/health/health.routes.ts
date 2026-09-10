import { Router } from 'express'
import { authenticate, requireModules } from '../../middleware/auth'
import { getHealthDashboard } from './health.controller'

const router = Router()

router.get('/overview', authenticate, requireModules('health'), getHealthDashboard)

export default router