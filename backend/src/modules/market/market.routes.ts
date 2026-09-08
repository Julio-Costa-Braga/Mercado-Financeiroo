import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import {
  getAssets,
  getAsset,
  getBars,
  getMarketOverview,
  getSectors,
  getSectorsPerformance,
  getGainersLosers,
} from './market.controller'

const router = Router()

router.get('/', authenticate, getAssets)
router.get('/movers', authenticate, getGainersLosers)
router.get('/sectors/performance', authenticate, getSectorsPerformance)
router.get('/:ticker', authenticate, getAsset)
router.get('/:ticker/bars', authenticate, getBars)

export default router
