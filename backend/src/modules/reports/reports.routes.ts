import { Router } from 'express'
import { authenticate, requireModules } from '../../middleware/auth'
import { getKpis } from './reports.controller'

const router = Router()

router.get('/kpis', authenticate, requireModules('reports'), getKpis)

export default router