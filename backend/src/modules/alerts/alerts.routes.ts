import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import {
  listAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  markAlertRead,
} from './alerts.controller'

const router = Router()

router.get('/', authenticate, listAlerts)
router.post('/', authenticate, createAlert)
router.put('/:id', authenticate, updateAlert)
router.delete('/:id', authenticate, deleteAlert)
router.post('/deliveries/:id/read', authenticate, markAlertRead)

export default router