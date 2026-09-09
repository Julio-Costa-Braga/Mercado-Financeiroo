import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import {
  getBriefing,
  getClientSketch,
  getQuestions,
  getTips,
  listRequests,
  postChat,
  submitOnboarding,
} from './ai.controller'

const router = Router()

router.get('/briefing', authenticate, getBriefing)
router.get('/requests', authenticate, listRequests)
router.get('/questions', authenticate, getQuestions)
router.post('/onboarding', authenticate, submitOnboarding)
router.get('/tips', authenticate, getTips)
router.get('/clients/:clientId/sketch', authenticate, getClientSketch)
router.post('/chat', authenticate, postChat)

export default router