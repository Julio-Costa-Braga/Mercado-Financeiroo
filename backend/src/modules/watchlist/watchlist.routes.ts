import { Router } from 'express'
import { authenticate, requireModules } from '../../middleware/auth'
import {
  getWatchlists,
  createWatchlist,
  addAsset,
  removeAsset,
  reorderAssets,
} from './watchlist.controller'

const router = Router()

router.get('/', authenticate, requireModules('watchlist'), getWatchlists)
router.post('/', authenticate, requireModules('watchlist'), createWatchlist)
router.post('/:id/assets', authenticate, requireModules('watchlist'), addAsset)
router.delete('/:id/assets/:assetId', authenticate, requireModules('watchlist'), removeAsset)
router.put('/:id/assets/reorder', authenticate, requireModules('watchlist'), reorderAssets)

export default router