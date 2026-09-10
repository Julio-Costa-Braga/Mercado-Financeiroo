import { Router } from 'express'
import { authenticate, requireModules } from '../../middleware/auth'
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

router.get('/briefing', authenticate, requireModules('assistant'), getBriefing)
router.get('/requests', authenticate, requireModules('assistant'), listRequests)
router.get('/questions', authenticate, requireModules('assistant'), getQuestions)
router.post('/onboarding', authenticate, requireModules('assistant'), submitOnboarding)
router.get('/tips', authenticate, requireModules('assistant'), getTips)
router.get('/clients/:clientId/sketch', authenticate, requireModules('assistant'), getClientSketch)
router.post('/chat', authenticate, requireModules('assistant'), postChat)

export default router