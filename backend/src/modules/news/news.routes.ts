import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { listNews, getNews, getLatestNews } from './news.controller'

const router = Router()

router.get('/', authenticate, listNews)
router.get('/latest', authenticate, getLatestNews)
router.get('/:id', authenticate, getNews)

export default router