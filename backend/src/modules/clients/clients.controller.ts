import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Errors } from '../../utils/errors'
import { dispatch, EventTopics } from '../../config/events'
import { generateClientSketch } from '../ai/ai.service'
import * as XLSX from 'xlsx'

const CLIENT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  country: true,
  status: true,
  retentionStage: true,
  riskProfile: true,
  clientType: true,
  objective: true,
  experience: true,
  churnRisk: true,
  priorityScore: true,
  onboardingCompletedAt: true,
  lastContactAt: true,
  lastLoginAt: true,
  lastInteractionAt: true,
  owner: { select: { id: true, name: true } },
  interests: { select: { interest: true, weight: true } },
  createdAt: true,
  updatedAt: true,
}

export async function listClients(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      status, ownerId, country, interest, churnRisk, lastContactBefore,
      search, page = '1', limit = '50', sortBy = 'updatedAt', sortOrder = 'desc',
      mine = 'false',
    } = req.query as any

    const where: any = {}
    if (status) where.status = status
    if (ownerId) where.ownerId = ownerId
    if (mine === 'true') where.ownerId = req.user!.id
    if (country) where.country = country
    if (churnRisk) where.churnRisk = { gte: parseInt(churnRisk) }
    if (lastContactBefore) where.lastContactAt = { lt: new Date(lastContactBefore as string) }
    if (interest) {
      where.interests = { some: { interest: { contains: interest, mode: 'insensitive' } } }
    }
    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }]
    }

    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))

    const [total, clients] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
        select: CLIENT_SELECT,
      }),
    ])

    res.json({ clients, total, page: pageNum, limit: limitNum })
  } catch (err) {
    next(err)
  }
}

export async function getClient(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        ...CLIENT_SELECT,
        experience: true,
        objective: true,
        tags: { select: { tag: true } },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { author: { select: { name: true } } },
        },
        contacts: {
          orderBy: { contactAt: 'desc' },
          take: 50,
          include: { user: { select: { name: true } } },
        },
        events: { orderBy: { date: 'desc' }, take: 100 },
        scores: { orderBy: { createdAt: 'desc' }, take: 30 },
        retentionHistory: { orderBy: { createdAt: 'desc' }, take: 50 },
        watchlists: { include: { assets: { include: { asset: true } } } },
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { owner: { select: { name: true } } },
        },
        alerts: { take: 20 },
        user: { select: { id: true, email: true, role: true } },
        documents: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { id: true, name: true, category: true, mimeType: true, size: true, createdAt: true, uploadedBy: { select: { name: true } } },
        },
        _count: { select: { tasks: true, notes: true, interests: true, documents: true } },
      },
    })

    if (!client) throw Errors.notFound('Cliente não encontrado')

    // Get financial events
    const financial = await prisma.financialEvent.findMany({
      where: { clientId: id },
      orderBy: { date: 'desc' },
      take: 100,
    })

    res.json({ client, financial })
  } catch (err) {
    next(err)
  }
}

export async function createClient(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, phone, country, status, ownerId, interests, tags, experience, objective } = req.body

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        country,
        status,
        // Clientes novos entram na base do CRM (VENDAS) sem dono: o gateway
        // (ADMIN/MANAGER/CRM) faz a atribuição para um vendedor.
        ownerId: ownerId || null,
        salesStage: 'CRM_BASE',
        experience,
        objective,
        interests: interests ? { create: interests.map((i: string) => ({ interest: i })) } : undefined,
        tags: tags ? { create: tags.map((t: string) => ({ tag: t })) } : undefined,
      },
      select: CLIENT_SELECT,
    })

    // Esboco automatico gerado pela IA em background (nao bloqueia a resposta)
    queueMicrotask(() => {
      generateClientSketch(client.id).catch(() => {})
    })

    res.status(201).json({ client })
  } catch (err) {
    next(err)
  }
}

// Importa clientes em massa a partir de um arquivo Excel (.xlsx/.xls) ou CSV.
// Colunas aceitas (case-insensitive, sem acento): name/nome, email, phone/telefone,
// country/pais/país, interests/interesses (separado por vírgula).
// Clientes novos entram direto na base do CRM (VENDAS) sem dono (salesStage CRM_BASE).
export async function importClients(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) throw Errors.badRequest('Envie um arquivo Excel ou CSV')
    if (file.size > 12 * 1024 * 1024) throw Errors.badRequest('Arquivo excede 12MB')

    let workbook: XLSX.WorkBook
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer' })
    } catch {
      throw Errors.badRequest('Arquivo inválido — envie um .xlsx, .xls ou CSV válido')
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) throw Errors.badRequest('O arquivo não possui planilhas')

    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    if (rows.length === 0) throw Errors.badRequest('A planilha está vazia')

    const norm = (h: string) =>
      String(h || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()

    const keyFor = (header: string, variants: string[]) => {
      const n = norm(header)
      return variants.some((v) => n.includes(v))
    }

    const imported: any[] = []
    const skipped: string[] = []
    let totalRows = 0

    for (const row of rows) {
      totalRows += 1
      const headers = Object.keys(row)
      let name = ''
      let email = ''
      let phone = ''
      let country = ''
      let interests: string[] = []

      for (const h of headers) {
        const raw = String(row[h] ?? '').trim()
        if (!raw) continue
        if (keyFor(h, ['nome', 'name', 'cliente'])) name = name || raw
        else if (keyFor(h, ['email', 'e-mail', 'mail'])) email = email || raw
        else if (keyFor(h, ['telefone', 'phone', 'celular', 'tel'])) phone = phone || raw
        else if (keyFor(h, ['pais', 'país', 'country', 'p'])) country = country || raw
        else if (keyFor(h, ['interesse', 'interests', 'interesses'])) interests = raw.split(/[,;]/).map((i) => i.trim()).filter(Boolean)
      }

      if (!name) {
        skipped.push(`linha ${totalRows + 1}: sem nome`)
        continue
      }

      const exists = email
        ? await prisma.client.findFirst({
            where: { email: email.toLowerCase() },
            select: { id: true },
          })
        : null

      if (exists) {
        skipped.push(`${name}: e-mail já cadastrado`)
        continue
      }

      const client = await prisma.client.create({
        data: {
          name,
          email: email || undefined,
          phone: phone || undefined,
          country: country || undefined,
          salesStage: 'CRM_BASE',
          interests: interests.length ? { create: interests.map((i) => ({ interest: i, weight: 5 })) } : undefined,
        },
        select: CLIENT_SELECT,
      })
      imported.push(client)

      queueMicrotask(() => {
        generateClientSketch(client.id).catch(() => {})
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'clients.imported',
        entity: 'Client',
        entityId: '',
        meta: { imported: imported.length, skipped: skipped.length, totalRows },
      } as any,
    })

    res.status(201).json({ imported: imported.length, skipped: skipped.slice(0, 50), totalRows })
  } catch (err) {
    next(err)
  }
}

export async function updateClient(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const {
      name, email, phone, country, status, ownerId, experience, objective,
      retentionStage, riskProfile, clientType,
    } = req.body

    const before = await prisma.client.findUnique({ where: { id } })
    if (!before) throw Errors.notFound('Cliente nǜo encontrado')

    const stageChanged =
      retentionStage && before.retentionStage ? retentionStage !== before.retentionStage : retentionStage != null

    const ops: any[] = [
      prisma.client.update({
        where: { id },
        data: { name, email, phone, country, status, ownerId, experience, objective, retentionStage, riskProfile, clientType },
        select: CLIENT_SELECT,
      }),
    ]

    if (stageChanged) {
      ops.push(
        prisma.retentionStatusHistory.create({
          data: {
            clientId: id,
            from: before.retentionStage || null,
            to: retentionStage,
          },
        }),
        prisma.clientEvent.create({
          data: {
            clientId: id,
            type: 'RETENTION_STAGE_CHANGED',
            meta: { from: before.retentionStage || 'default', to: retentionStage, via: 'edit' },
          },
        })
      )
    }

    const [client] = await prisma.$transaction(ops)

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'client.updated',
        entity: 'Client',
        entityId: id,
        before: { name: before.name, status: before.status },
        after: { name: client.name, status: client.status },
      },
    })

    if (stageChanged) {
      dispatch(EventTopics.CLIENT_UPDATED, { clientId: id, retentionStage })
    }

    // Atualiza o esboco do cliente em background
    queueMicrotask(() => {
      generateClientSketch(id).catch(() => {})
    })

    res.json({ client })
  } catch (err) {
    next(err)
  }
}

export async function addInterest(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { interest, weight = 5 } = req.body
    const exists = await prisma.clientInterest.findFirst({ where: { clientId: id, interest } })
    if (exists) {
      await prisma.clientInterest.update({ where: { id: exists.id }, data: { weight } })
    } else {
      await prisma.clientInterest.create({ data: { clientId: id, interest, weight } })
    }
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'client.interest.updated', entity: 'ClientInterest', entityId: id },
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function removeInterest(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { interest } = req.body
    await prisma.clientInterest.deleteMany({ where: { clientId: id, interest } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function addNote(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { content } = req.body
    await prisma.clientNote.create({
      data: { clientId: id, authorId: req.user!.id, content },
    })
    await prisma.client.update({
      where: { id },
      data: { lastInteractionAt: new Date() },
    })
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'client.note.created', entity: 'ClientNote', entityId: id },
    })
    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function addContact(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { contactAt, type, notes, via } = req.body
    await prisma.clientContact.create({
      data: { clientId: id, userId: req.user!.id, contactAt: contactAt || new Date(), type, notes, via },
    })
    await prisma.client.update({
      where: { id },
      data: { lastContactAt: contactAt || new Date(), lastInteractionAt: new Date() },
    })
    await prisma.clientEvent.create({
      data: { clientId: id, type, date: contactAt || new Date() },
    })
    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function getPriorityClients(req: Request, res: Response, next: NextFunction) {
  try {
    const clients = await prisma.client.findMany({
      where: { status: { in: ['ACTIVE', 'AT_RISK'] } },
      orderBy: { priorityScore: 'desc' },
      take: 20,
      select: CLIENT_SELECT,
    })
    res.json({ clients })
  } catch (err) {
    next(err)
  }
}