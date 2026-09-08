import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { screener } from './screener.controller'

const router = Router()

router.get('/', authenticate, screener)

export default router