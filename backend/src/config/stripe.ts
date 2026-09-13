// Configuracao Stripe (depositos/pagamentos do cliente).
// Sem STRIPE_SECRET_KEY o sistema opera sem pagamentos online
// (a aba do portal exibe os eventos financeiros registrados).

const DEFAULT_FRONTEND_URL = 'https://mercado-financeiroo.vercel.app'

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

export function stripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null
}

export function frontendUrl(): string {
  return process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL
}

export function stripeApiKey(): string | null {
  return process.env.STRIPE_SECRET_KEY || null
}