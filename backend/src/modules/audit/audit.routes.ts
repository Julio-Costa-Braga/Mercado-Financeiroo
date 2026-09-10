import { Router } from 'express'
import { authenticate, requireModules } from '../../middleware/auth'
import { getAuditLogs } from './audit.controller'

const router = Router()

router.get('/', authenticate, requireModules('audit'), getAuditLogs)

export default router