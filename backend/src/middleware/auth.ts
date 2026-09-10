import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { Errors } from '../utils/errors'
import { prisma } from '../config/prisma'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: string
        sessionId: string
      }
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      throw Errors.unauthorized('Token não fornecido')
    }

    const token = header.split(' ')[1]
    const payload = verifyToken(token)

    // Check session is still valid
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
    })
    if (!session || session.revokedAt) {
      throw Errors.unauthorized('Sessão expirada ou revogada')
    }
    if (session.expiresAt < new Date()) {
      throw Errors.unauthorized('Sessão expirada')
    }

    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    }

    next()
  } catch (err) {
    next(err)
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw Errors.unauthorized()
    }
    if (!roles.includes(req.user.role)) {
      throw Errors.forbidden()
    }
    next()
  }
}

const TEAM_ROLES = ['ADMIN', 'MANAGER', 'RETENTION', 'SALES', 'RESEARCH', 'COMPLIANCE']

// Restringe acesso a rotas internas (equipe). Clientes so tem acesso ao portal.
export function requireTeam(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw Errors.unauthorized()
  }
  if (!TEAM_ROLES.includes(req.user.role)) {
    throw Errors.forbidden()
  }
  next()
}
