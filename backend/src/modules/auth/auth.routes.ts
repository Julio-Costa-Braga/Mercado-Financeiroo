import { Router } from 'express'
import { validate } from '../../middleware/error'
import { authenticate } from '../../middleware/auth'
import {
  loginSchema,
  mfaVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
} from './auth.schemas'
import {
  login,
  logout,
  mfaVerify,
  refresh,
  forgotPassword,
  resetPassword,
  me,
  setupMfa,
  enableMfa,
  disableMfa,
} from './auth.controller'

const router = Router()

router.post('/login', validate(loginSchema), login)
router.post('/logout', authenticate, logout)
router.post('/refresh', validate(refreshSchema), refresh)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), resetPassword)
router.post('/mfa/verify', validate(mfaVerifySchema), mfaVerify)
router.get('/me', authenticate, me)
router.post('/mfa/setup', authenticate, setupMfa)
router.post('/mfa/enable', authenticate, enableMfa)
router.post('/mfa/disable', authenticate, disableMfa)

export default router
