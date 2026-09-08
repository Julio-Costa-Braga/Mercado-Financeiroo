import { EventEmitter } from 'events'

// Barramento de eventos do domínio.
// Módulos emitem eventos aqui; a camada de WebSocket (socket.ts) escuta e repassa aos clientes.

export const events = new EventEmitter()
events.setMaxListeners(50)

export const EventTopics = {
  QUOTE_UPDATED: 'market.quote.updated',
  BAR_UPDATED: 'market.bar.updated',
  NEWS_RECEIVED: 'news.received',
  ALERT_TRIGGERED: 'alert.triggered',
  RETENTION_SCORE_CHANGED: 'retention.score.changed',
  CLIENT_UPDATED: 'client.updated',
  TASK_CREATED: 'task.created',
  FINANCIAL_EVENT_CREATED: 'financial.event.created',
} as const

export type DomainEvent = {
  topic: string
  payload: Record<string, unknown>
  at: Date
}

export function dispatch(topic: string, payload: Record<string, unknown>) {
  events.emit(topic, { topic, payload, at: new Date() } satisfies DomainEvent)
}