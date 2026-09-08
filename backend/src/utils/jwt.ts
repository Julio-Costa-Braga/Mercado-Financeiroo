import jwt, { SignOptions } from 'jsonwebtoken'

export interface JwtPayload {
  userId: string
  email: string
  role: string
  sessionId: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'
const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions)
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN } as SignOptions)
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}
