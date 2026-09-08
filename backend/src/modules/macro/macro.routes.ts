import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getIndicators, getIndicator, getObservations, getRegions } from './macro.controller'

const router = Router()

router.get('/', authenticate, getIndicators)
router.get('/regions', authenticate, getRegions)
router.get('/observations', authenticate, getObservations)
router.get('/:code', authenticate, getIndicator)

export default router