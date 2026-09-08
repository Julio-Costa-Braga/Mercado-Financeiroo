import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getKpis } from './reports.controller'

const router = Router()

router.get('/kpis', authenticate, getKpis)

export default router