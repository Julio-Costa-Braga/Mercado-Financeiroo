import { z } from 'zod'

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Senha muito curta'),
  }),
})

export const mfaVerifySchema = z.object({
  body: z.object({
    email: z.string().email(),
    code: z.string().min(6).max(6),
  }),
})

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('E-mail inválido'),
  }),
})

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  }),
})

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
})
