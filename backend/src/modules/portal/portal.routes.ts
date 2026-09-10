import { Router } from 'express'
import multer from 'multer'
import { authenticate, requireRole } from '../../middleware/auth'
import {
  getPortalOverview,
  getPortalDeposits,
  listPortalDocuments,
  uploadPortalDocument,
  downloadPortalDocument,
  deletePortalDocument,
} from './portal.controller'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } })

const router = Router()

router.use(authenticate, requireRole('CLIENT'))

router.get('/overview', getPortalOverview)
router.get('/deposits', getPortalDeposits)
router.get('/documents', listPortalDocuments)
router.post('/documents', upload.single('file'), uploadPortalDocument)
router.get('/documents/:docId/download', downloadPortalDocument)
router.delete('/documents/:docId', deletePortalDocument)

export default router