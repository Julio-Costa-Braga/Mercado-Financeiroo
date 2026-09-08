import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getBriefing, listRequests } from './ai.controller'

const router = Router()

router.get('/briefing', authenticate, getBriefing)
router.get('/requests', authenticate, listRequests)

export default router