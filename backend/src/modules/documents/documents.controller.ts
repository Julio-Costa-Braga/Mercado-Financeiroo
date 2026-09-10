import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Errors } from '../../utils/errors'

const MAX_SIZE = 12 * 1024 * 1024

function pickCategory(name: string): string {
  const n = name.toLowerCase()
  if (/(\.pdf$)/.test(n)) return 'PDF'
  if (/proposta|contrato|adesao/.test(n)) return 'CONTRATO'
  if (/(\.(png|jpe?g|webp|heic)$)/.test(n)) return 'IMAGEM'
  if (/declaracao|ir|imposto/.test(n)) return 'FISCAL'
  if (/identidade|rg|cpf|passaporte|cnh/.test(n)) return 'IDENTIDADE'
  if (/comprovante/.test(n)) return 'COMPROVANTE'
  return 'DOCUMENTO'
}

export async function uploadClientDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const file = (req as any).file as Express.Multer.File | undefined

    const client = await prisma.client.findUnique({ where: { id } })
    if (!client) throw Errors.notFound('Cliente não encontrado')
    if (!file) throw Errors.badRequest('Nenhum arquivo enviado')
    if (file.size > MAX_SIZE) throw Errors.badRequest('Arquivo excede 12MB')

    const doc = await prisma.clientDocument.create({
      data: {
        clientId: id,
        uploadedById: req.user!.id,
        name: file.originalname || 'documento',
        category: pickCategory(file.originalname || ''),
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        data: Buffer.from(file.buffer),
      },
      select: { id: true, name: true, category: true, mimeType: true, size: true, createdAt: true },
    })

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'client.document.uploaded', entity: 'client', entityId: id, after: { docId: doc.id, name: doc.name } as any },
    })

    res.status(201).json({ document: doc })
  } catch (err) {
    next(err)
  }
}

export async function listClientDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const documents = await prisma.clientDocument.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, category: true, mimeType: true, size: true, createdAt: true, uploadedBy: { select: { name: true } } },
    })
    res.json({ documents })
  } catch (err) {
    next(err)
  }
}

export async function downloadClientDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { docId } = req.params
    const doc = await prisma.clientDocument.findUnique({ where: { id: docId } })
    if (!doc) throw Errors.notFound('Documento não encontrado')

    res.setHeader('Content-Type', doc.mimeType)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.name)}"`)
    res.send(Buffer.from(doc.data))
  } catch (err) {
    next(err)
  }
}

export async function deleteClientDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { docId } = req.params
    const doc = await prisma.clientDocument.findUnique({ where: { id: docId } })
    if (!doc) throw Errors.notFound('Documento não encontrado')

    await prisma.clientDocument.delete({ where: { id: docId } })
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'client.document.deleted', entity: 'client', entityId: doc.clientId, before: { docId, name: doc.name } as any },
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}