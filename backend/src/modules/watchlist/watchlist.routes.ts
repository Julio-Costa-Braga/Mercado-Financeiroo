import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import {
  getWatchlists,
  createWatchlist,
  addAsset,
  removeAsset,
  reorderAssets,
} from './watchlist.controller'

const router = Router()

router.get('/', authenticate, getWatchlists)
router.post('/', authenticate, createWatchlist)
router.post('/:id/assets', authenticate, addAsset)
router.delete('/:id/assets/:assetId', authenticate, removeAsset)
router.put('/:id/assets/reorder', authenticate, reorderAssets)

export default router