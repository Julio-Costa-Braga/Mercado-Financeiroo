import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../../config/prisma'
import { Errors } from '../../utils/errors'

// M24 - Administração

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  team: true,
  status: true,
  timezone: true,
  locale: true,
  currency: true,
  mfaEnabled: true,
  lastLoginAt: true,
  createdAt: true,
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { role, status, search, page = '1', limit = '50' } = req.query as any
    const where: any = {}
    if (role) where.role = role
    if (status) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: USER_SELECT,
      }),
    ])

    res.json({ users, total })
  } catch (err) {
    next(err)
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name, role, team, timezone, locale, currency } = req.body

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) throw Errors.conflict('E-mail já cadastrado')

    const passwordHash = await bcrypt.hash(password || 'Mudar123!', 10)
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), passwordHash, name, role, team, timezone, locale, currency },
      select: USER_SELECT,
    })

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'admin.user.created', entity: 'User', entityId: user.id },
    })

    res.status(201).json({ user })
  } catch (err) {
    next(err)
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { name, role, team, status, timezone, locale, currency, password } = req.body

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) throw Errors.notFound('Usuário não encontrado')

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        role,
        team,
        status,
        timezone,
        locale,
        currency,
        passwordHash: password ? await bcrypt.hash(password, 10) : existing.passwordHash,
      },
      select: USER_SELECT,
    })

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'admin.user.updated',
        entity: 'User',
        entityId: id,
        before: { role: existing.role, status: existing.status },
        after: { role: user.role, status: user.status },
      },
    })

    res.json({ user })
  } catch (err) {
    next(err)
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    if (id === req.user!.id) throw Errors.badRequest('Não é possível excluir a si mesmo')
    await prisma.user.delete({ where: { id } })
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'admin.user.deleted', entity: 'User', entityId: id },
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}