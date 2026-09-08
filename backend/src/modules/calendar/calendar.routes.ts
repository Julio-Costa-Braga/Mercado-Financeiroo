import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getCalendar, getUpcoming } from './calendar.controller'

const router = Router()

router.get('/', authenticate, getCalendar)
router.get('/upcoming', authenticate, getUpcoming)

export default router