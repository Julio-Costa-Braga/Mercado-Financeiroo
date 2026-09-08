import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getHealthDashboard } from './health.controller'

const router = Router()

router.get('/overview', authenticate, getHealthDashboard)

export default router