import { Router } from 'express'
import { authenticate, requireModules } from '../../middleware/auth'
import {
  listAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  markAlertRead,
} from './alerts.controller'

const router = Router()

router.get('/', authenticate, requireModules('alerts'), listAlerts)
router.post('/', authenticate, requireModules('alerts'), createAlert)
router.put('/:id', authenticate, requireModules('alerts'), updateAlert)
router.delete('/:id', authenticate, requireModules('alerts'), deleteAlert)
router.post('/deliveries/:id/read', authenticate, requireModules('alerts'), markAlertRead)

export default router