export class AppError extends Error {
  public statusCode: number
  public code: string

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

export const Errors = {
  unauthorized: (msg = 'Não autorizado') => new AppError(msg, 401, 'UNAUTHORIZED'),
  forbidden: (msg = 'Acesso negado') => new AppError(msg, 403, 'FORBIDDEN'),
  notFound: (msg = 'Não encontrado') => new AppError(msg, 404, 'NOT_FOUND'),
  conflict: (msg = 'Conflito') => new AppError(msg, 409, 'CONFLICT'),
  badRequest: (msg = 'Requisição inválida') => new AppError(msg, 400, 'BAD_REQUEST'),
  locked: (msg = 'Conta bloqueada temporariamente') => new AppError(msg, 423, 'LOCKED'),
  tooManyRequests: (msg = 'Muitas tentativas') => new AppError(msg, 429, 'TOO_MANY_REQUESTS'),
}
