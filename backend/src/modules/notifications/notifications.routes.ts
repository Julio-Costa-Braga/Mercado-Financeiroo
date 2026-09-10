import { Router } from 'express'
import { authenticate, requireModules } from '../../middleware/auth'
import { getNotifications, markRead, markAllRead } from './notifications.controller'

const router = Router()

router.get('/', authenticate, requireModules('notifications'), getNotifications)
router.post('/read-all', authenticate, requireModules('notifications'), markAllRead)
router.post('/:id/read', authenticate, requireModules('notifications'), markRead)

export default router