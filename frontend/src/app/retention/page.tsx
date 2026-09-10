'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { Card, Spinner, StatusBadge, Button } from '@/components/ui'
import ClientEditModal from '@/components/ClientEditModal'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

type StageKey = 'ticket' | 'contacted' | 'recovery' | 'recovered' | 'churned'

interface KanbanCard {
  id: string
  name: string
  email: string | null
  status: string
  stage: string
  owner: string | null
  country: string | null
  priorityScore: number
  churnRisk: number
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  breakdown: Array<{ reason: string; points: number }>
  lastContactAt: string | null
  daysSinceContact: number | null
  lastEvent: { type: string; date: string } | null
  interests: string[]
  openTasksCount: number
  alertsCount: number
  riskProfile: string | null
}

interface KanbanData {
  columns: Record<StageKey, KanbanCard[]>
  counts: Record<StageKey, number>
}

interface Metrics {
  retentionRate: number
  activeClients: number
  churned: number
  total: number
}

const COLUMN_CFG: Array<{
  key: StageKey
  labelKey: string
  dot: string
  border: string
  headerBg: string
}> = [
  { key: 'ticket', labelKey: 'retention.columns.ticket', dot: 'bg-gray-400', border: 'border-gray-500/40', headerBg: 'bg-gray-500/10' },
  { key: 'contacted', labelKey: 'retention.columns.contacted', dot: 'bg-blue-400', border: 'border-blue-500/40', headerBg: 'bg-blue-500/10' },
  { key: 'recovery', labelKey: 'retention.columns.recovery', dot: 'bg-orange-400', border: 'border-orange-500/40', headerBg: 'bg-orange-500/10' },
  { key: 'recovered', labelKey: 'retention.columns.recovered', dot: 'bg-emerald-400', border: 'border-emerald-500/40', headerBg: 'bg-emerald-500/10' },
  { key: 'churned', labelKey: 'retention.columns.churned', dot: 'bg-market-down', border: 'border-market-down/40', headerBg: 'bg-market-down/10' },
]

const RISK_STYLES: Record<string, string> = {
  CRITICAL: 'text-market-down bg-market-down/10 border-market-down/40',
  HIGH: 'text-orange-400 bg-orange-400/10 border-orange-400/40',
  MEDIUM: 'text-amber-400 bg-amber-400/10 border-amber-400/40',
  LOW: 'text-gray-400 bg-gray-400/10 border-gray-400/40',
}

const RISK_LABEL_KEY: Record<string, string> = {
  CRITICAL: 'retention.risk.critical',
  HIGH: 'retention.risk.high',
  MEDIUM: 'retention.risk.medium',
  LOW: 'retention.risk.low',
}

function CardInfo({ card }: { card: KanbanCard }) {
  const { t } = useI18n()
  return (
    <p className="text-[11px] text-gray-500 truncate">
      {card.country || '—'}
      {card.owner && <span> · {card.owner}</span>}
      {card.riskProfile && <span> · {card.riskProfile}</span>}
    </p>
  )
}

export default function RetentionPage() {
  const { t } = useI18n()
  const [data, setData] = useState<KanbanData | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dragged, setDragged] = useState<{ id: string; from: StageKey } | null>(null)
  const [over, setOver] = useState<StageKey | null>(null)
  const [moving, setMoving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [k, m] = await Promise.all([
        api.get<KanbanData>('/retention/kanban'),
        api.get<Metrics>('/retention/metrics'),
      ])
      setData(k)
      setMetrics(m)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar o board')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handleDrop(e: React.DragEvent, to: StageKey) {
    e.preventDefault()
    if (!dragged || dragged.from === to) {
      setOver(null)
      setDragged(null)
      return
    }
    setOver(null)
    setMoving(true)
    const toS = to.toUpperCase()
    const fromS = dragged.from.toUpperCase()
    // Métricas superiores também atualizam na hora (taxa de retenção / ativos / baixas)
    setMetrics((prev) => {
      if (!prev) return prev
      let dChurned = 0
      let dActive = 0
      if (toS === 'CHURNED' && fromS !== 'CHURNED') dChurned += 1
      if (fromS === 'CHURNED' && toS !== 'CHURNED') dChurned -= 1
      if (toS === 'RECOVERED' && fromS !== 'RECOVERED') dActive += 1
      if (fromS === 'RECOVERED' && toS !== 'RECOVERED') dActive -= 1
      if (!dChurned && !dActive) return prev
      const churned = Math.max(0, prev.churned + dChurned)
      const activeClients = Math.max(0, prev.activeClients + dActive)
      return {
        ...prev,
        churned,
        activeClients,
        retentionRate: prev.total > 0 ? Math.round(((prev.total - churned) / prev.total) * 100) : 0,
      }
    })
    // Otimista
    setData((prev) => {
      if (!prev) return prev
      const card = prev.columns[dragged.from].find((c) => c.id === dragged.id)
      if (!card) return prev
      const columns = { ...prev.columns }
      columns[dragged.from] = columns[dragged.from].filter((c) => c.id !== dragged.id)
      columns[to] = [{ ...card, stage: to.toUpperCase() }, ...columns[to]]
      const counts = Object.fromEntries(
        (Object.keys(columns) as StageKey[]).map((k) => [k, columns[k].length])
      ) as Record<StageKey, number>
      return { columns, counts }
    })
    setDragged(null)

    api
      .post(`/retention/kanban/${dragged.id}/move`, { toStage: to.toUpperCase() })
      .then(() => load())
      .catch(() => {
        setError('Falha ao mover o cartão')
        load()
      })
      .finally(() => setMoving(false))
  }

  if (loading) return <Main><Spinner /></Main>

  const atRisk =
    (data?.counts.ticket ?? 0) + (data?.counts.contacted ?? 0) + (data?.counts.recovery ?? 0)

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t('retention.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('retention.subtitle')}</p>
      </header>

      {error && (
        <div className="mb-4 text-xs text-market-down bg-market-down/10 border border-market-down/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="flex flex-col gap-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retention.metrics.rate')}</p>
          <p className="text-2xl font-bold tabular-nums text-market-accent">
            {metrics ? `${metrics.retentionRate}%` : '—'}
          </p>
          <p className="text-xs text-gray-500">{metrics ? `${metrics.activeClients} ${t('retention.metrics.active')}` : ''}</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retention.metrics.pipeline')}</p>
          <p className="text-2xl font-bold tabular-nums text-white">{data?.counts ? Object.values(data.counts).reduce((a, b) => a + b, 0) : '—'}</p>
          <p className="text-xs text-gray-500">{t('retention.metrics.total')}</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retention.metrics.atRisk')}</p>
          <p className="text-2xl font-bold tabular-nums text-orange-400">{atRisk}</p>
          <p className="text-xs text-gray-500">{t('retention.metrics.atRiskHint')}</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retention.metrics.recovered')}</p>
          <p className="text-2xl font-bold tabular-nums text-market-up">{data?.counts.recovered ?? '—'}</p>
          <p className="text-xs text-gray-500">{t('retention.metrics.active')}</p>
        </Card>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {COLUMN_CFG.map((col) => {
          const clients = data?.columns[col.key] || []
          const dragOver = over === col.key
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault()
                if (over !== col.key) setOver(col.key)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null)
              }}
              onDrop={(e) => handleDrop(e, col.key)}
              className={`w-72 sm:w-80 shrink-0 flex flex-col max-h-[70vh] rounded-2xl border bg-market-card/40 backdrop-blur-sm transition-all ${
                dragOver ? 'border-market-accent/70 bg-market-accent/10 shadow-lg shadow-market-accent/10' : col.border
              }`}
            >
              {/* Cabeçalho da coluna */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl border-b border-market-border/60 ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-200">{t(col.labelKey as any)}</span>
                </div>
                <span className="text-[11px] font-semibold text-gray-400 bg-market-bg/70 border border-market-border rounded-full px-2 py-0.5 tabular-nums">
                  {clients.length}
                </span>
              </div>

              {/* Cartões */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[120px]">
                {clients.length === 0 && !dragOver && (
                  <div className="h-20 flex items-center justify-center rounded-xl border border-dashed border-market-border text-[11px] text-gray-600 text-center px-3">
                    {t('retention.dropHere')}
                  </div>
                )}
                {clients.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onClick={() => setEditingId(c.id)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', c.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setDragged({ id: c.id, from: col.key })
                    }}
                    onDragEnd={() => {
                      setDragged(null)
                      setOver(null)
                    }}
                    title={t('clientModal.open')}
                    className={`group rounded-xl border bg-market-card border-market-border p-3 cursor-grab active:cursor-grabbing hover:border-market-accent/40 hover:shadow-lg hover:shadow-black/20 transition-all ${
                      dragged?.id === c.id ? 'opacity-40' : ''
                    } ${moving ? 'pointer-events-none' : ''}`}
                  >
                    {/* Topo */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <Link
                        href={`/clients/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-semibold text-gray-100 hover:text-market-accent truncate"
                      >
                        {c.name}
                      </Link>
                      <StatusBadge status={c.status} />
                    </div>
                    <CardInfo card={c} />

                    {/* Risco + score */}
                    <div className="flex items-center justify-between mt-2.5 gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${RISK_STYLES[c.riskLevel] || RISK_STYLES.LOW}`}>
                        {t(RISK_LABEL_KEY[c.riskLevel] as any)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-gray-500">{t('retention.score')}</span>
                        <span className="text-sm font-bold tabular-nums text-white">{c.priorityScore}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpanded(expanded === c.id ? null : c.id)
                          }}
                          className="text-gray-500 hover:text-market-accent transition-colors"
                          aria-label="Explicar score"
                        >
                          <svg className={`w-3.5 h-3.5 transition-transform ${expanded === c.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Explicação do score */}
                    {expanded === c.id && c.breakdown.length > 0 && (
                      <div className="mt-2 space-y-1 bg-market-bg rounded-lg border border-market-border p-2">
                        {c.breakdown.map((b) => (
                          <div key={b.reason} className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-400 truncate pr-2">{b.reason}</span>
                            <span className="font-mono text-gray-300 shrink-0">+{b.points}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Último contato */}
                    {c.daysSinceContact !== null && (
                      <p className={`mt-2.5 text-[11px] ${c.daysSinceContact >= 30 ? 'text-market-down font-semibold' : 'text-gray-500'}`}>
                        {c.daysSinceContact === 0
                          ? t('retention.today')
                          : `${c.daysSinceContact} ${t('retention.days')} ${t('retention.withoutContact')}`}
                      </p>
                    )}

                    {/* Interesses */}
                    {c.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.interests.slice(0, 4).map((i) => (
                          <span key={i} className="text-[10px] bg-market-accent/10 text-market-accent border border-market-accent/20 px-1.5 py-0.5 rounded">
                            {i}
                          </span>
                        ))}
                        {c.interests.length > 4 && (
                          <span className="text-[10px] text-gray-500 px-1 py-0.5">+{c.interests.length - 4}</span>
                        )}
                      </div>
                    )}

                    {/* Rodapé */}
                    <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-market-border/60 text-[11px] text-gray-500">
                      {c.openTasksCount > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          {c.openTasksCount}
                        </span>
                      )}
                      {c.alertsCount > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.6A5 5 0 0117 12V9a5 5 0 00-10 0v3a5 5 0 01-0.6 2.4L5 17h5m5 0v1a3 3 0 11-6 0v-1m6 0H10" />
                          </svg>
                          {c.alertsCount}
                        </span>
                      )}
                      {c.lastEvent && (
                        <span className="truncate flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-market-accent shrink-0" />
                          <span className="truncate">{c.lastEvent.type}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-600">
        <Button size="sm" variant="ghost" onClick={() => load()}>
          {t('retention.refresh')}
        </Button>
        <span>{t('retention.hint')}</span>
      </div>

      <ClientEditModal
        clientId={editingId}
        onClose={() => setEditingId(null)}
        onChanged={() => load()}
      />
    </Main>
  )
}