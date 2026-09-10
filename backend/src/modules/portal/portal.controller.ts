import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Errors } from '../../utils/errors'

// Portal do cliente — o cliente acessa o proprio perfil, depositos e documentos.

const DEPOSIT_TYPES = ['DEPOSIT', 'INITIAL_DEPOSIT', 'REPEAT_DEPOSIT', 'FTD']

export function isDeposit(type: string): boolean {
  return DEPOSIT_TYPES.includes(type)
}

export async function clientFromUser(userId: string) {
  const client = await prisma.client.findUnique({ where: { userId } })
  if (!client) throw Errors.notFound('Perfil de cliente não vinculado')
  return client
}

export async function getPortalOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await clientFromUser(req.user!.id)

    const [financial, documents, alerts, _count] = await Promise.all([
      prisma.financialEvent.findMany({ where: { clientId: client.id }, orderBy: { date: 'desc' }, take: 100 }),
      prisma.clientDocument.findMany({ where: { clientId: client.id }, orderBy: { createdAt: 'desc' } }),
      prisma.alert.findMany({ where: { clientId: client.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.client.count({ where: { id: client.id } }),
    ])

    const deposits = financial.filter((e) => isDeposit(e.type))

    res.json({
      overview: {
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          country: client.country,
          riskProfile: client.riskProfile,
          clientType: client.clientType,
          onboardingCompletedAt: client.onboardingCompletedAt,
        },
        totals: {
          deposits: deposits.length,
          depositAmount: Number(deposits.reduce((a, e) => a + e.amount, 0).toFixed(2)),
          documents: documents.length,
          interactions: financial.length,
        },
        recentDocuments: documents.slice(0, 5),
        alerts: alerts,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function getPortalDeposits(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await clientFromUser(req.user!.id)
    const events = await prisma.financialEvent.findMany({
      where: { clientId: client.id },
      orderBy: { date: 'desc' },
    })
    res.json({ deposits: events })
  } catch (err) {
    next(err)
  }
}

export async function listPortalDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await clientFromUser(req.user!.id)
    const documents = await prisma.clientDocument.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, category: true, mimeType: true, size: true, createdAt: true },
    })
    res.json({ documents })
  } catch (err) {
    next(err)
  }
}

export async function uploadPortalDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await clientFromUser(req.user!.id)
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) throw Errors.badRequest('Nenhum arquivo enviado')
    if (file.size > 12 * 1024 * 1024) throw Errors.badRequest('Arquivo excede 12MB')

    const doc = await prisma.clientDocument.create({
      data: {
        clientId: client.id,
        uploadedById: req.user!.id,
        name: file.originalname || 'documento',
        category: 'ENVIADO_PELO_CLIENTE',
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        data: Buffer.from(file.buffer),
      },
      select: { id: true, name: true, category: true, mimeType: true, size: true, createdAt: true },
    })
    res.status(201).json({ document: doc })
  } catch (err) {
    next(err)
  }
}

export async function deletePortalDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await clientFromUser(req.user!.id)
    const { docId } = req.params
    const doc = await prisma.clientDocument.findFirst({ where: { id: docId, clientId: client.id } })
    if (!doc) throw Errors.notFound('Documento não encontrado')

    await prisma.clientDocument.delete({ where: { id: docId } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export async function downloadPortalDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await clientFromUser(req.user!.id)
    const { docId } = req.params
    const doc = await prisma.clientDocument.findFirst({ where: { id: docId, clientId: client.id } })
    if (!doc) throw Errors.notFound('Documento não encontrado')

    res.setHeader('Content-Type', doc.mimeType)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.name)}"`)
    res.send(Buffer.from(doc.data))
  } catch (err) {
    next(err)
  }
}