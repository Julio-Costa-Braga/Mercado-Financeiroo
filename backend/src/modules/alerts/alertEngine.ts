import { prisma } from '../../config/prisma'
import { dispatch, EventTopics } from '../../config/events'
import { createNotification } from '../notifications/notifications.controller'

// M22 - Motor de alertas
// Avalia alertas ativos (PRICE/MARKET/VOLUME) a cada atualizacao de cotacao e
// dispara notificacao in-app + evento de socket (tempo real).

export interface AlertQuote {
  price: number
  changePct1D: number | null
  volume?: bigint | null
}

export async function loadActiveAlerts(): Promise<Map<string, Array<{ id: string; userId: string | null; type: string; condition: string; threshold: number | null }>>> {
  const alerts = await prisma.alert.findMany({
    where: { status: 'ACTIVE', assetId: { not: null }, type: { in: ['PRICE', 'MARKET', 'VOLUME'] } },
    select: { id: true, userId: true, type: true, condition: true, threshold: true, assetId: true },
  })
  const byAsset = new Map<string, Array<{ id: string; userId: string | null; type: string; condition: string; threshold: number | null }>>()
  for (const a of alerts) {
    if (!a.assetId) continue
    const list = byAsset.get(a.assetId) ?? []
    list.push({ id: a.id, userId: a.userId, type: a.type, condition: a.condition, threshold: a.threshold })
    byAsset.set(a.assetId, list)
  }
  return byAsset
}

export async function evaluateAlerts(
  assetId: string,
  assetTicker: string,
  quote: AlertQuote,
  activeByAsset: Map<string, Array<{ id: string; userId: string | null; type: string; condition: string; threshold: number | null }>>,
): Promise<void> {
  const alerts = activeByAsset.get(assetId) ?? []
  for (const a of alerts) {
    if (a.threshold == null) continue

    let hit = false
    if (a.type === 'PRICE') {
      hit = a.condition === '>' ? quote.price > a.threshold : a.condition === '<' ? quote.price < a.threshold : false
    } else if (a.type === 'MARKET') {
      const ch = quote.changePct1D ?? 0
      hit = a.condition === '>' ? ch > a.threshold : a.condition === '<' ? ch < a.threshold : false
    } else if (a.type === 'VOLUME') {
      const v = Number(quote.volume ?? 0n)
      hit = a.condition === '>' ? v > a.threshold : a.condition === '<' ? v < a.threshold : false
    }
    if (!hit) continue

    try {
      await prisma.$transaction([
        prisma.alert.update({ where: { id: a.id }, data: { status: 'TRIGGERED', triggeredAt: new Date() } }),
        prisma.alertDelivery.create({ data: { alertId: a.id, channel: 'IN_APP' } }),
      ])

      const body =
        a.type === 'PRICE'
          ? `Preço em US$ ${quote.price.toFixed(2)} (${a.condition === '>' ? 'acima' : 'abaixo'} do limite ${a.threshold}).`
          : a.type === 'MARKET'
            ? `Variação ${quote.changePct1D?.toFixed(2) ?? '—'}% ${a.condition === '>' ? 'acima' : 'abaixo'} do limite ${a.threshold}%.`
            : `Volume do ativo ${a.condition === '>' ? 'acima' : 'abaixo'} do limite configurado.`

      if (a.userId) {
        await createNotification(a.userId, 'ALERT', `Alerta disparado: ${assetTicker}`, body)
      }

      dispatch(EventTopics.ALERT_TRIGGERED, {
        alertId: a.id,
        asset: assetTicker,
        type: a.type,
        condition: a.condition,
        threshold: a.threshold,
        price: quote.price,
        changePct1D: quote.changePct1D,
        userId: a.userId ?? null,
      })
    } catch (err: any) {
      // alerta ja disparado (corrida) ou erro de escrita -> ignora
      console.warn(`[alerts] erro ao disparar alerta ${a.id}: ${err.message}`)
    }
  }
}