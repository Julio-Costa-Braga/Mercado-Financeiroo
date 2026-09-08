import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import {
  getAssets,
  getAsset,
  getBars,
  getMarketOverview,
  getSectors,
  getGainersLosers,
} from './market.controller'

const router = Router()

router.get('/', authenticate, getAssets)
router.get('/movers', authenticate, getGainersLosers)
router.get('/:ticker', authenticate, getAsset)
router.get('/:ticker/bars', authenticate, getBars)

export default router
