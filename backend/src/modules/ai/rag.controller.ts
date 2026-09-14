import { Request, Response, NextFunction } from 'express'
import { Errors } from '../../utils/errors'
import {
  deleteKnowledgeDoc,
  indexDocument,
  indexRecentNews,
  listKnowledgeDocs,
  ragStatusDetailed,
  retrieveContext,
} from './rag'

// Rotas de gerenciamento/busca do RAG (montadas sob /api/v1/ai/rag).

export async function getRagStatus(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ rag: await ragStatusDetailed() })
  } catch (err) {
    next(err)
  }
}

export async function ragListDocs(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ documents: await listKnowledgeDocs() })
  } catch (err) {
    next(err)
  }
}

export async function ragCreateDoc(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content, category, source } = req.body as any
    if (!title || !content) throw Errors.badRequest('title e content são obrigatórios')
    const result = await indexDocument({ title: String(title), content: String(content), category, source })
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

export async function ragDeleteDoc(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await deleteKnowledgeDoc(req.params.id))
  } catch (err) {
    next(err)
  }
}

export async function ragIndexNews(req: Request, res: Response, next: NextFunction) {
  try {
    const { limit } = req.query as any
    const result = await indexRecentNews(parseInt(limit) || 20)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function ragSearch(req: Request, res: Response, next: NextFunction) {
  try {
    const { query, k } = req.body as any
    if (!query) throw Errors.badRequest('query é obrigatória')
    const sources = await retrieveContext(String(query), parseInt(k) || 4)
    res.json({ query, sources, rag: await ragStatusDetailed() })
  } catch (err) {
    next(err)
  }
}