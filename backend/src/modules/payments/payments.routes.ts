import { Router } from 'express'
import { authenticate, requireTeamModulesOrClient } from '../../middleware/auth'
import { createDepositCheckout, handleStripeWebhook } from './payments.controller'

const router = Router()

// Cliente deposita sozinho (após o 1º depósito) ou equipe cria para um cliente.
router.post('/checkout', authenticate, requireTeamModulesOrClient('deposits'), createDepositCheckout)
router.post('/webhook', handleStripeWebhook)

export default router