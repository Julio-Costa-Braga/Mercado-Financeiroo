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
import {
  getRagStatus,
  ragCreateDoc,
  ragDeleteDoc,
  ragIndexNews,
  ragListDocs,
  ragSearch,
} from './rag.controller'

const router = Router()

router.get('/briefing', authenticate, requireModules('assistant'), getBriefing)
router.get('/requests', authenticate, requireModules('assistant'), listRequests)
router.get('/questions', authenticate, requireModules('assistant'), getQuestions)
router.post('/onboarding', authenticate, requireModules('assistant'), submitOnboarding)
router.get('/tips', authenticate, requireModules('assistant'), getTips)
router.get('/clients/:clientId/sketch', authenticate, requireModules('assistant'), getClientSketch)
router.post('/chat', authenticate, requireModules('assistant'), postChat)

// RAG — base de conhecimento
router.get('/rag/status', authenticate, requireModules('assistant'), getRagStatus)
router.get('/rag/docs', authenticate, requireModules('assistant', 'admin'), ragListDocs)
router.post('/rag/docs', authenticate, requireModules('assistant', 'admin'), ragCreateDoc)
router.delete('/rag/docs/:id', authenticate, requireModules('assistant', 'admin'), ragDeleteDoc)
router.post('/rag/news/index', authenticate, requireModules('assistant', 'admin'), ragIndexNews)
router.post('/rag/search', authenticate, requireModules('assistant'), ragSearch)

export default router