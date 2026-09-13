import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../config/prisma'
import { Errors } from '../../utils/errors'
import { stripeEnabled, stripeApiKey, stripeWebhookSecret, frontendUrl } from '../../config/stripe'
import { autoSettleDeposit } from '../sales/sales.controller'

// Pagamentos do cliente via Stripe (MVP: deposito em conta).
// Checkout Session hosted (Stripe) + webhook que registra o FinancialEvent
// e dispara o handoff automatico (autoSettleDeposit) quando aprovado.

const STRIPE_API = 'https://api.stripe.com/v1'
const SUPPORTED_CURRENCIES = ['usd', 'brl', 'eur']

export async function createDepositCheckout(req: Request, res: Response, next: NextFunction) {
  try {
    if (!stripeEnabled()) {
      throw Errors.badRequest('Pagamentos online indisponíveis no momento')
    }

    const { amount, currency } = req.body as { amount?: number; currency?: string }
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 1 || value > 100000) {
      throw Errors.badRequest('Valor do depósito deve estar entre 1 e 100000')
    }
    const cur = (currency || 'USD').toLowerCase()
    if (!SUPPORTED_CURRENCIES.includes(cur)) {
      throw Errors.badRequest('Moeda não suportada')
    }

    const client = await prisma.client.findUnique({ where: { userId: req.user!.id } })
    if (!client) throw Errors.notFound('Perfil de cliente não vinculado')

    const cents = Math.round(value * 100)
    const amountLabel = value.toFixed(2)
    const body = new URLSearchParams()
    body.set('mode', 'payment')
    body.set('success_url', `${frontendUrl()}/portal/deposits?stripe=success`)
    body.set('cancel_url', `${frontendUrl()}/portal/deposits?stripe=canceled`)
    body.set('client_reference_id', client.id)
    body.set('customer_email', client.email || req.user!.email)
    body.set('metadata[clientId]', client.id)
    body.set('metadata[userId]', req.user!.id)
    body.set('line_items[0][price_data][currency]', cur)
    body.set('line_items[0][price_data][unit_amount]', String(cents))
    body.set('line_items[0][price_data][product_data][name]', 'Depósito em conta')
    body.set('line_items[0][price_data][product_data][description]', `Depósito de ${amountLabel} ${cur.toUpperCase()}`)
    body.set('line_items[0][quantity]', '1')

    const resp = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeApiKey()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-06-20',
      },
      body: body.toString(),
    })

    const data: any = await resp.json()
    if (!resp.ok) {
      throw Errors.badRequest(data?.error?.message || 'Falha ao criar sessão de pagamento')
    }

    res.json({ url: data.url, sessionId: data.id })
  } catch (err) {
    next(err)
  }
}

// Webhook do Stripe — verifica a assinatura e registra o deposito aprovado.
export async function handleStripeWebhook(req: Request, res: Response) {
  const rawBody = req.body as Buffer
  const sig = req.headers['stripe-signature'] as string | undefined
  const secret = stripeWebhookSecret()

  if (!rawBody || !sig || !secret) {
    return res.status(400).json({ error: 'Faltam payload ou assinatura' })
  }

  try {
    const payload = verifyStripeSignature(rawBody, sig)
    const event = JSON.parse(payload)

    if (event?.type === 'checkout.session.completed') {
      const session = event.data?.object
      if (session?.payment_status === 'paid' && session.metadata?.clientId) {
        const clientId = session.metadata.clientId
        const amount = Number(session.amount_total) / 100

        const already = await prisma.financialEvent.findFirst({
          where: { clientId, meta: { path: ['stripe', 'sessionId'], equals: session.id } },
        })
        if (!already) {
          const event = await prisma.financialEvent.create({
            data: {
              clientId,
              type: 'DEPOSIT',
              amount,
              currency: String(session.currency || 'usd').toUpperCase(),
              date: new Date(),
              meta: {
                stripe: {
                  sessionId: session.id,
                  paymentIntent: session.payment_intent || null,
                  provider: 'stripe',
                  currency: session.currency || 'usd',
                },
              },
            },
          })

          await prisma.auditLog.create({
            data: {
              userId: null,
              action: 'financial.event.created',
              entity: 'FinancialEvent',
              entityId: event.id,
              meta: { source: 'stripe-webhook', sessionId: session.id },
            } as any,
          })

          await autoSettleDeposit(clientId, amount).catch(() => {})
        }
      }
    }

    res.json({ received: true })
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Assinatura inválida' })
  }
}

// Stripe assina `t=<timestamp>,v1=<hmac>` sobre `${t}.${rawBody}`.
function verifyStripeSignature(rawBody: Buffer, sigHeader: string): string {
  const parts = sigHeader.split(',').map((p) => p.trim())
  const map = new Map<string, string>()
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq > 0) map.set(part.slice(0, eq), part.slice(eq + 1))
  }
  const ts = map.get('t')
  const v1 = map.get('v1')
  if (!ts || !v1) throw new Error('Formato de assinatura inválido')

  const crypto = require('crypto')
  const expected = crypto
    .createHmac('sha256', stripeWebhookSecret())
    .update(`${ts}.${rawBody}`)
    .digest('hex')

  const a = Buffer.from(v1)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Assinatura não confere')
  }
  return rawBody.toString('utf8')
}