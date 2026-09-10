import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { authenticator } from 'otplib'
import qrcode from 'qrcode'
import { prisma } from '../../config/prisma'
import { signAccessToken, signRefreshToken } from '../../utils/jwt'
import { Errors } from '../../utils/errors'
import { logger } from '../../config/logger'
import { effectiveModules } from '../../config/modules'

const MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutes

const TOTP_ISSUER = 'Mercado Financeiro'

async function recordAudit(userId: string | null, action: string, meta?: any) {
  await prisma.auditLog.create({
    data: { userId, action, ...(meta || {}) },
  }).catch((e) => logger.error('Audit log failed:', e.message))
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

    // Always run a dummy compare to avoid timing attacks
    const hashToCompare = user?.passwordHash || '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalid'
    const valid = await bcrypt.compare(password, hashToCompare)

    // Check lockout
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      throw Errors.locked('Conta bloqueada temporariamente. Tente novamente mais tarde.')
    }

    if (!user || !valid || user.status !== 'ACTIVE') {
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: { increment: 1 } },
        })
        if (user.loginAttempts + 1 >= MAX_ATTEMPTS) {
          await prisma.user.update({
            where: { id: user.id },
            data: { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS), loginAttempts: 0 },
          })
          await recordAudit(user.id, 'auth.locked', { reason: 'max_attempts' })
          throw Errors.locked('Muitas tentativas inválidas. Conta bloqueada por 15 minutos.')
        }
      }
      throw Errors.unauthorized('Credenciais inválidas')
    }

    // Successful password check - reset attempts
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    })

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: randomUUID() + randomUUID(),
        ip: req.ip,
        userAgent: req.headers['user-agent']?.slice(0, 500),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    }

    // If MFA enabled, return a pending token so the client prompts MFA
    if (user.mfaEnabled) {
      const accessToken = signAccessToken(payload)
      await recordAudit(user.id, 'auth.login.pending_mfa')
      return res.json({
        mfaRequired: true,
        accessToken,
      })
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)
    await recordAudit(user.id, 'auth.login')

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        team: user.team,
        mfaEnabled: user.mfaEnabled,
        modules: effectiveModules(user),
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function mfaVerify(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, code } = req.body
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw Errors.badRequest('MFA não configurado')
    }

    const valid = authenticator.check(code, user.mfaSecret)
    if (!valid) {
      throw Errors.unauthorized('Código MFA inválido')
    }

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: randomUUID() + randomUUID(),
        ip: req.ip,
        userAgent: req.headers['user-agent']?.slice(0, 500),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)
    await recordAudit(user.id, 'auth.login.mfa_ok')

    res.json({ accessToken, refreshToken })
  } catch (err) {
    next(err)
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.user?.sessionId
    if (sessionId) {
      await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } })
      await recordAudit(req.user!.id, 'auth.logout')
    }
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body
    const payload = require('../../utils/jwt').verifyToken(refreshToken)

    const session = await prisma.session.findUnique({ where: { id: payload.sessionId } })
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw Errors.unauthorized('Refresh token inválido')
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user || user.status !== 'ACTIVE') {
      throw Errors.unauthorized('Usuário inválido')
    }

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    })

    res.json({ accessToken })
  } catch (err) {
    next(err)
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

    // Always respond ok to avoid user enumeration
    if (user) {
      const token = randomUUID() + randomUUID()
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      })
      // TODO: send email with reset link (no email provider in MVP)
      logger.info(`Password reset token for ${email}: ${token}`)
    }

    res.json({ ok: true, message: 'Se houver uma conta com este e-mail, enviaremos um link de recuperação.' })
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw Errors.badRequest('Token de recuperação inválido ou expirado')
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    })
    await prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } })

    // Revoke all sessions
    await prisma.session.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    await recordAudit(resetToken.userId, 'auth.password_reset')

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        team: true,
        modules: true,
        timezone: true,
        locale: true,
        currency: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })
    if (!user) throw Errors.notFound('Usuário não encontrado')
    res.json({ user: { ...user, modules: effectiveModules(user) } })
  } catch (err) {
    next(err)
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  return getMe(req, res, next)
}

export async function setupMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) throw Errors.notFound('Usuário não encontrado')
    if (user.mfaEnabled) throw Errors.badRequest('MFA já configurado')

    const secret = authenticator.generateSecret()
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret },
    })

    const otpauth = authenticator.keyuri(user.email, TOTP_ISSUER, secret)
    const qrCode = await qrcode.toDataURL(otpauth)

    res.json({ secret, qrCode })
  } catch (err) {
    next(err)
  }
}

export async function enableMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.body
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user || !user.mfaSecret) throw Errors.badRequest('MFA não iniciado')

    const valid = authenticator.check(code, user.mfaSecret)
    if (!valid) throw Errors.badRequest('Código inválido')

    await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true } })
    await recordAudit(user.id, 'auth.mfa_enabled')
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function disableMfa(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { mfaEnabled: false, mfaSecret: null },
    })
    await recordAudit(req.user!.id, 'auth.mfa_disabled')
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}
