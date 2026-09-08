import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getNotifications, markRead, markAllRead } from './notifications.controller'

const router = Router()

router.get('/', authenticate, getNotifications)
router.post('/read-all', authenticate, markAllRead)
router.post('/:id/read', authenticate, markRead)

export default router