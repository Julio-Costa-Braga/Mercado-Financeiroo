import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { createDepositCheckout, handleStripeWebhook } from './payments.controller'

const router = Router()

router.post('/checkout', authenticate, requireRole('CLIENT'), createDepositCheckout)
router.post('/webhook', handleStripeWebhook)

export default router