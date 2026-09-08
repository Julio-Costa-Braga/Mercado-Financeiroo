import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../utils/errors'
import { logger } from '../config/logger'

export function validate(schema: any) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        next(new AppError(err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '), 400, 'VALIDATION_ERROR'))
      } else {
        next(err)
      }
    }
  }
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } })
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
      },
    })
  }

  logger.error(err)

  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } })
}

export function notFound(_req: Request, res: Response) {
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada' } })
}
