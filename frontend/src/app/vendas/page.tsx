'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { Card, Spinner, StatusBadge, Button } from '@/components/ui'
import ClientEditModal from '@/components/ClientEditModal'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

type StageKey = 'base' | 'assigned' | 'contacted' | 'deposited' | 'retention' | 'lost'

interface SalesCard {
  id: string
  name: string
  email: string | null
  phone: string | null
  country: string | null
  status: string
  stage: string
  ownerId: string | null
  owner: string | null
  soldBy: string | null
  soldAt: string | null
  sentToCrmAt: string | null
  firstDepositValue: number | null
  refundedAt: string | null
  salesLostReason: string | null
  retentionStage: string | null
  churnRisk: number
  priorityScore: number
  lastContactAt: string | null
  hasDeposit: boolean
  lastEvent: { type: string; date: string } | null
  interests: string[]
}

interface SalesUser {
  id: string
  name: string
  email: string
  group?: 'SALES' | 'RETENTION'
}

interface SalesKanbanData {
  columns: Record<StageKey, SalesCard[]>
  counts: Record<StageKey, number>
  users?: SalesUser[]
  view: 'seller' | 'gateway'
}

interface SellerMetrics {
  sellerId: string
  name: string
  email: string
  soldCount: number
  salesValue: number
  refundedCount: number
  refundedValue: number
  sentToCrmCount: number
  routedRetentionCount: number
  pipelineCount: number
}

interface SalesMetrics {
  scope: 'seller' | 'crm'
  seller?: { id: string; name: string; email: string }
  metrics?: SellerMetrics
  recent?: Array<{
    id: string
    name: string
    soldAt: string | null
    sentToCrmAt: string | null
    firstDepositValue: number | null
    refundedAt: string | null
    salesStage: string
    status: string
  }>
  sellers?: SellerMetrics[]
  totals?: SellerMetrics | null
}

const COLUMN_CFG: Array<{
  key: StageKey
  labelKey: string
  dot: string
  border: string
  headerBg: string
}> = [
  { key: 'base', labelKey: 'sales.columns.base', dot: 'bg-gray-400', border: 'border-gray-500/40', headerBg: 'bg-gray-500/10' },
  { key: 'assigned', labelKey: 'sales.columns.assigned', dot: 'bg-blue-400', border: 'border-blue-500/40', headerBg: 'bg-blue-500/10' },
  { key: 'contacted', labelKey: 'sales.columns.contacted', dot: 'bg-cyan-400', border: 'border-cyan-500/40', headerBg: 'bg-cyan-500/10' },
  { key: 'deposited', labelKey: 'sales.columns.deposited', dot: 'bg-emerald-400', border: 'border-emerald-500/40', headerBg: 'bg-emerald-500/10' },
  { key: 'retention', labelKey: 'sales.columns.retention', dot: 'bg-purple-400', border: 'border-purple-500/40', headerBg: 'bg-purple-500/10' },
  { key: 'lost', labelKey: 'sales.columns.lost', dot: 'bg-market-down', border: 'border-market-down/40', headerBg: 'bg-market-down/10' },
]

const money = (n: number | null | undefined): string => {
  if (n == null) return '—'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDay(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString()
}

function AssignModal({
  group,
  onConfirm,
  onClose,
  users,
}: {
  group: 'SALES' | 'RETENTION'
  users: SalesUser[]
  onConfirm: (assigneeId: string) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const list = (users || []).filter((u) => (u.group || 'SALES') === group)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-market-border bg-market-card p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-white">{t('sales.assign.title')}</h3>
        <p className="text-xs text-gray-500 mt-1 mb-4">{t('sales.assign.subtitle')}</p>
        <p className="text-xs text-gray-400 mb-2">{t(group === 'SALES' ? 'sales.assignGroup.sales' : 'sales.assignGroup.retention')}</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {list.length === 0 && <p className="text-xs text-gray-500">{t('sales.dropHere')}</p>}
          {list.map((u) => (
            <button
              key={u.id}
              onClick={() => onConfirm(u.id)}
              className="w-full flex items-center justify-between rounded-xl border border-market-border bg-market-bg/50 px-4 py-3 text-left hover:border-market-accent/50 hover:bg-market-accent/5 transition-all"
            >
              <div>
                <p className="text-sm font-medium text-gray-200">{u.name}</p>
                <p className="text-[11px] text-gray-500">{u.email}</p>
              </div>
              <span className="text-market-accent">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7-7 7M5 12h16" />
                </svg>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onClose}>{t('sales.assign.cancel')}</Button>
        </div>
      </div>
    </div>
  )
}

function DepositModal({
  card,
  onConfirm,
  onClose,
}: {
  card: SalesCard
  onConfirm: (id: string) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-market-border bg-market-card p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-white">{t('sales.deposit.title')}</h3>
        <p className="text-xs text-gray-500 mt-1">{t('sales.deposit.subtitle')}</p>
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">{t('sales.deposit.value')}</p>
          <p className={`text-xl font-bold tabular-nums ${card.hasDeposit ? 'text-market-up' : 'text-gray-400'}`}>
            {card.hasDeposit && card.firstDepositValue != null ? money(card.firstDepositValue) : t('sales.deposit.notFound')}
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('sales.assign.cancel')}</Button>
          <Button onClick={() => onConfirm(card.id)}>{t('sales.deposit.confirm')}</Button>
        </div>
      </div>
    </div>
  )
}

function LostModal({
  card,
  onConfirm,
  onClose,
}: {
  card: SalesCard
  onConfirm: (id: string, reason: string) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-market-border bg-market-card p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-market-down">{t('sales.lost.title')}</h3>
        <p className="text-xs text-gray-500 mt-1">{card.name}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('sales.lostPlaceholder')}
          rows={3}
          className="mt-4 w-full rounded-xl border border-market-border bg-market-bg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-market-accent focus:outline-none"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('sales.assign.cancel')}</Button>
          <Button variant="danger" onClick={() => onConfirm(card.id, reason)}>{t('sales.lost.confirm')}</Button>
        </div>
      </div>
    </div>
  )
}

function KanbanCardChip({ card, view, onBackToBase }: {
  card: SalesCard
  view: 'seller' | 'gateway'
  onBackToBase: (id: string) => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {card.owner && (
        <span className="text-[10px] bg-blue-400/10 text-blue-300 border border-blue-400/20 px-1.5 py-0.5 rounded flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          {card.owner}
        </span>
      )}
      {card.soldBy && (
        <span className="text-[10px] bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 px-1.5 py-0.5 rounded flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          {t('sales.soldBy')}: {card.soldBy}
        </span>
      )}
      {card.firstDepositValue != null && (!card.refundedAt) && (
        <span className="text-[10px] bg-market-up/10 text-market-up border border-market-up/20 px-1.5 py-0.5 rounded">
          {t('sales.depositValue')}: {money(card.firstDepositValue)}
        </span>
      )}
      {card.refundedAt && (
        <span className="text-[10px] bg-market-down/10 text-market-down border border-market-down/20 px-1.5 py-0.5 rounded">
          {t('sales.refunded')}
        </span>
      )}
      {card.salesLostReason && (
        <span className="text-[10px] text-gray-500 px-1 py-0.5 italic truncate max-w-full">{card.salesLostReason}</span>
      )}
      {view === 'gateway' && card.stage === 'DEPOSITED' && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onBackToBase(card.id)
          }}
          className="text-[10px] bg-market-accent/10 text-market-accent border border-market-accent/20 px-1.5 py-0.5 rounded hover:bg-market-accent/20 transition-colors"
        >
          {'←'}</button>
      )}
    </div>
  )
}

export default function SalesPage() {
  const { t } = useI18n()
  const [data, setData] = useState<SalesKanbanData | null>(null)
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'kanban' | 'dashboard' | 'base'>('kanban')
  const [dragged, setDragged] = useState<{ id: string; from: StageKey } | null>(null)
  const [over, setOver] = useState<StageKey | null>(null)
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [assignModal, setAssignModal] = useState<{ card: SalesCard; group: 'SALES' | 'RETENTION'; target: StageKey } | null>(null)
  const [depositModal, setDepositModal] = useState<SalesCard | null>(null)
  const [lostModal, setLostModal] = useState<SalesCard | null>(null)

  const load = useCallback(async () => {
    try {
      const k = await api.get<SalesKanbanData>('/sales/kanban')
      setData(k)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar o pipeline')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMetrics = useCallback(async () => {
    try {
      const m = await api.get<SalesMetrics>('/sales/metrics')
      setMetrics(m)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar o dashboard')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (tab === 'dashboard') loadMetrics()
  }, [tab, loadMetrics])

  async function doMove(cardId: string, toStage: string, assigneeId?: string, reason?: string) {
    setMoving(true)
    try {
      await api.post(`/sales/kanban/${cardId}/move`, { toStage, assigneeId, reason })
      await load()
    } catch (err: any) {
      setError(err.message || 'Falha ao mover o cartão')
      load()
    } finally {
      setMoving(false)
    }
  }

  function handleDrop(e: React.DragEvent, to: StageKey) {
    e.preventDefault()
    if (!dragged) {
      setOver(null)
      return
    }
    setOver(null)
    const card = data?.columns[dragged.from].find((c) => c.id === dragged.id)
    setDragged(null)
    if (!card) return
    const view = data?.view || 'gateway'
    const toS = to.toUpperCase()

    const isModalPath =
      (view === 'seller' && (to === 'deposited' || to === 'lost')) ||
      (view === 'gateway' && (to === 'assigned' || to === 'contacted' || to === 'retention' || to === 'lost'))
    if (isModalPath) {
      if (view === 'seller' && to === 'deposited') setDepositModal(card)
      else if (view === 'seller' && to === 'lost') setLostModal(card)
      else if (view === 'gateway' && to === 'retention') setAssignModal({ card, group: 'RETENTION', target: 'retention' })
      else if (view === 'gateway' && (to === 'assigned' || to === 'contacted')) setAssignModal({ card, group: 'SALES', target: to })
      else if (view === 'gateway' && to === 'lost') setLostModal(card)
      return
    }

    const isDirect =
      (view === 'seller' && to === 'contacted') ||
      (view === 'gateway' && to === 'base')
    if (!isDirect) return

    // Otimista
    setData((prev) => {
      if (!prev) return prev
      const src = prev.columns[dragged.from]
      if (!src.find((c) => c.id === dragged.id)) return prev
      const columns = { ...prev.columns }
      columns[dragged.from] = src.filter((c) => c.id !== dragged.id)
      columns[to] = [{ ...card, stage: toS }, ...columns[to]]
      const counts = Object.fromEntries(
        (Object.keys(columns) as StageKey[]).map((k) => [k, columns[k].length])
      ) as Record<StageKey, number>
      return { ...prev, columns, counts }
    })

    doMove(card.id, toS)
  }

  if (loading) return <Main><Spinner /></Main>

  const view = data?.view || 'gateway'
  const columns: StageKey[] = view === 'seller'
    ? ['assigned', 'contacted', 'deposited', 'lost']
    : ['base', 'assigned', 'contacted', 'deposited', 'retention', 'lost']

  const counts = data?.counts || ({} as Record<StageKey, number>)
  const pipeline =
    (counts.assigned || 0) + (counts.contacted || 0)

  const BASE_STAGE_KEYS: StageKey[] = ['base', 'assigned', 'contacted', 'deposited', 'retention']
  const allBaseClients = (data?.columns
    ? BASE_STAGE_KEYS.flatMap((k) => (data.columns[k] || []).map((c) => ({ card: c, stageKey: k })))
    : []) as Array<{ card: SalesCard; stageKey: StageKey }>

  const dashboardSeller = metrics?.scope === 'seller' ? metrics.seller : undefined

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t('sales.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('sales.subtitle')}</p>
      </header>

      {error && (
        <div className="mb-4 text-xs text-market-down bg-market-down/10 border border-market-down/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('kanban')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'kanban' ? 'bg-market-accent/15 text-market-accent border border-market-accent/30' : 'text-gray-500 border border-market-border hover:text-gray-300'}`}
        >
          {t('sales.tabs.kanban')}
        </button>
        {view === 'gateway' && (
          <button
            onClick={() => setTab('base')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'base' ? 'bg-market-accent/15 text-market-accent border border-market-accent/30' : 'text-gray-500 border border-market-border hover:text-gray-300'}`}
          >
            {t('sales.tabs.base')}
          </button>
        )}
        <button
          onClick={() => setTab('dashboard')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'dashboard' ? 'bg-market-accent/15 text-market-accent border border-market-accent/30' : 'text-gray-500 border border-market-border hover:text-gray-300'}`}
        >
          {t('sales.tabs.dashboard')}
        </button>
      </div>

      {tab === 'kanban' ? (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="flex flex-col gap-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('retention.metrics.pipeline')}</p>
              <p className="text-2xl font-bold tabular-nums text-white">{data ? Object.values(counts).reduce((a, b) => a + b, 0) : '—'}</p>
              <p className="text-xs text-gray-500">{t('retention.metrics.total')}</p>
            </Card>
            <Card className="flex flex-col gap-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('sales.columns.assigned')}</p>
              <p className="text-2xl font-bold tabular-nums text-blue-400">{pipeline}</p>
              <p className="text-xs text-gray-500">{view === 'seller' ? t('sales.metrics.pipeline') : ''}</p>
            </Card>
            <Card className="flex flex-col gap-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('sales.columns.deposited')}</p>
              <p className="text-2xl font-bold tabular-nums text-market-up">{counts.deposited ?? 0}</p>
              <p className="text-xs text-gray-500">{t('sales.metrics.sentToCrm')}</p>
            </Card>
            <Card className="flex flex-col gap-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('sales.columns.lost')}</p>
              <p className="text-2xl font-bold tabular-nums text-market-down">{counts.lost ?? 0}</p>
              <p className="text-xs text-gray-500">{t('sales.metrics.refunded')}</p>
            </Card>
          </div>

          {/* Board */}
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
            {COLUMN_CFG.filter((col) => columns.includes(col.key)).map((col) => {
              const cards = data?.columns[col.key] || []
              const dragOver = over === col.key
              const locked =
                (view === 'seller' && !['contacted', 'deposited', 'lost'].includes(col.key)) ||
                (view === 'gateway' && !['assigned', 'contacted', 'retention', 'base', 'lost'].includes(col.key))
              return (
                <div
                  key={col.key}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (!locked && over !== col.key) setOver(col.key)
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null)
                  }}
                  onDrop={(e) => handleDrop(e, col.key)}
                  className={`w-72 sm:w-80 shrink-0 flex flex-col max-h-[70vh] rounded-2xl border bg-market-card/40 backdrop-blur-sm transition-all ${
                    dragOver && !locked ? 'border-market-accent/70 bg-market-accent/10 shadow-lg shadow-market-accent/10' : col.border
                  }`}
                >
                  <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl border-b border-market-border/60 ${col.headerBg}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-200">{t(col.labelKey as any)}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400 bg-market-bg/70 border border-market-border rounded-full px-2 py-0.5 tabular-nums">
                      {cards.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[120px]">
                    {cards.length === 0 && !dragOver && (
                      <div className="h-20 flex items-center justify-center rounded-xl border border-dashed border-market-border text-[11px] text-gray-600 text-center px-3">
                        {t('sales.dropHere')}
                      </div>
                    )}
                    {cards.map((c) => (
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
                        <p className="text-[11px] text-gray-500 truncate">
                          {[c.country, c.email].filter(Boolean).join(' · ') || '—'}
                        </p>

                        <KanbanCardChip card={c} view={view} onBackToBase={(id) => doMove(id, 'CRM_BASE')} />

                        {c.lastContactAt && (
                          <p className="mt-2 text-[11px] text-gray-500">{fmtDay(c.lastContactAt)}</p>
                        )}

                        {c.lastEvent && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-market-border/60 text-[11px] text-gray-500">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.refundedAt ? 'bg-market-down' : 'bg-market-accent'}`} />
                            <span className="truncate">{c.lastEvent.type}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-600">
            <Button size="sm" variant="ghost" onClick={() => load()}>
              {t('sales.refresh')}
            </Button>
            <span>{t('sales.hint')}</span>
          </div>
        </>
      ) : tab === 'base' ? (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-3">{t('sales.tabs.base')}</h3>
          {allBaseClients.length === 0 ? (
            <p className="text-xs text-gray-500">{t('sales.base.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-market-border">
                    <th className="pb-2 pr-4">{t('sales.client')}</th>
                    <th className="pb-2 pr-4">{t('sales.base.stage')}</th>
                    <th className="pb-2 pr-4">{t('sales.base.owner')}</th>
                    <th className="pb-2 pr-4">{t('sales.status')}</th>
                    <th className="pb-2">{t('sales.base.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {allBaseClients.map(({ card, stageKey }) => {
                    const col = COLUMN_CFG.find((c) => c.key === stageKey)
                    return (
                      <tr key={card.id} className="border-b border-market-border/50">
                        <td className="py-2.5 pr-4">
                          <Link href={`/clients/${card.id}`} className="text-gray-200 hover:text-market-accent">{card.name}</Link>
                          <p className="text-xs text-gray-500">{[card.country, card.email].filter(Boolean).join(' · ') || '—'}</p>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${col?.border || 'border-market-border'} ${col?.headerBg || ''}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${col?.dot || 'bg-gray-400'}`} />
                            <span className="text-gray-300">{col ? t(col.labelKey as any) : card.stage}</span>
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-400">{card.owner || '—'}</td>
                        <td className="py-2.5 pr-4"><StatusBadge status={card.status} /></td>
                        <td className="py-2.5 whitespace-nowrap">
                          <Button size="sm" onClick={() => setAssignModal({ card, group: 'SALES', target: 'assigned' })}>
                            {t('sales.base.toSeller')}
                          </Button>
                          <span className="inline-block w-2" />
                          <Button size="sm" variant="ghost" onClick={() => setAssignModal({ card, group: 'RETENTION', target: 'retention' })}>
                            {t('sales.base.toRetention')}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">{t('sales.dashboard.subtitle')}</p>

          {metrics?.scope === 'seller' && metrics.metrics && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('sales.metrics.sold')}</p>
                  <p className="text-2xl font-bold tabular-nums text-white">{metrics.metrics.soldCount}</p>
                  <p className="text-xs text-gray-500">{dashboardSeller?.name}</p>
                </Card>
                <Card className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('sales.metrics.value')}</p>
                  <p className="text-2xl font-bold tabular-nums text-market-up">{money(metrics.metrics.salesValue)}</p>
                  <p className="text-xs text-gray-500">${' '}{metrics.metrics.refundedCount} {t('sales.metrics.refunded')}</p>
                </Card>
                <Card className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('sales.metrics.pipeline')}</p>
                  <p className="text-2xl font-bold tabular-nums text-blue-400">{metrics.metrics.pipelineCount}</p>
                  <p className="text-xs text-gray-500">{t('sales.columns.assigned')}</p>
                </Card>
                <Card className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('sales.metrics.sentToCrm')}</p>
                  <p className="text-2xl font-bold tabular-nums text-market-accent">{metrics.metrics.sentToCrmCount}</p>
                  <p className="text-xs text-gray-500">{t('sales.metrics.routedRetention')}: {metrics.metrics.routedRetentionCount}</p>
                </Card>
              </div>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-gray-200 mb-3">{t('sales.dashboard.recent')}</h3>
                {metrics.recent && metrics.recent.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-market-border">
                          <th className="pb-2 pr-4">{t('sales.client')}</th>
                          <th className="pb-2 pr-4">{t('sales.value')}</th>
                          <th className="pb-2 pr-4">{t('sales.date')}</th>
                          <th className="pb-2 pr-4">{t('sales.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.recent.map((r) => (
                          <tr key={r.id} className="border-b border-market-border/50">
                            <td className="py-2.5 pr-4">
                              <Link href={`/clients/${r.id}`} className="text-gray-200 hover:text-market-accent">{r.name}</Link>
                            </td>
                            <td className="py-2.5 pr-4 tabular-nums text-gray-300">{money(r.firstDepositValue)}</td>
                            <td className="py-2.5 pr-4 text-gray-500">{fmtDay(r.soldAt)}</td>
                            <td className="py-2.5">
                              <StatusBadge status={r.refundedAt ? 'CHURNED' : r.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">{t('retention.dropHere')}</p>
                )}
              </Card>
            </>
          )}

          {metrics?.scope === 'crm' && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-200 mb-3">{t('sales.dashboard.you')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-market-border">
                      <th className="pb-2 pr-4">{t('sales.dashboard.name')}</th>
                      <th className="pb-2 pr-4">{t('sales.metrics.sold')}</th>
                      <th className="pb-2 pr-4">{t('sales.metrics.value')}</th>
                      <th className="pb-2 pr-4">{t('sales.metrics.pipeline')}</th>
                      <th className="pb-2 pr-4">{t('sales.metrics.refunded')}</th>
                      <th className="pb-2 pr-4">{t('sales.metrics.sentToCrm')}</th>
                      <th className="pb-2">{t('sales.metrics.routedRetention')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metrics.sellers || []).map((s) => (
                      <tr key={s.sellerId} className="border-b border-market-border/50">
                        <td className="py-2.5 pr-4 text-gray-200">{s.name}</td>
                        <td className="py-2.5 pr-4 tabular-nums text-gray-300">{s.soldCount}</td>
                        <td className="py-2.5 pr-4 tabular-nums text-market-up">{money(s.salesValue)}</td>
                        <td className="py-2.5 pr-4 tabular-nums text-blue-400">{s.pipelineCount}</td>
                        <td className="py-2.5 pr-4 tabular-nums text-market-down">{s.refundedCount} ({money(s.refundedValue)})</td>
                        <td className="py-2.5 pr-4 tabular-nums text-gray-300">{s.sentToCrmCount}</td>
                        <td className="py-2.5 tabular-nums text-gray-300">{s.routedRetentionCount}</td>
                      </tr>
                    ))}
                    {metrics.totals && (
                      <tr className="font-semibold text-gray-200">
                        <td className="py-2.5 pr-4">{t('sales.dashboard.total')}</td>
                        <td className="py-2.5 pr-4 tabular-nums">{metrics.totals.soldCount}</td>
                        <td className="py-2.5 pr-4 tabular-nums text-market-up">{money(metrics.totals.salesValue)}</td>
                        <td className="py-2.5 pr-4 tabular-nums">{metrics.totals.pipelineCount}</td>
                        <td className="py-2.5 pr-4 tabular-nums text-market-down">{metrics.totals.refundedCount} ({money(metrics.totals.refundedValue)})</td>
                        <td className="py-2.5 pr-4 tabular-nums">{metrics.totals.sentToCrmCount}</td>
                        <td className="py-2.5 tabular-nums">{metrics.totals.routedRetentionCount}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modais */}
      {assignModal && (
        <AssignModal
          group={assignModal.group}
          users={data?.users || []}
          onConfirm={(assigneeId) => {
            const toStage = assignModal.group === 'RETENTION'
              ? 'RETENTION'
              : assignModal.target === 'contacted'
                ? 'CONTACTED'
                : 'ASSIGNED'
            doMove(assignModal.card.id, toStage, assigneeId)
            setAssignModal(null)
          }}
          onClose={() => setAssignModal(null)}
        />
      )}
      {depositModal && (
        <DepositModal
          card={depositModal}
          onConfirm={(id) => {
            doMove(id, 'DEPOSITED')
            setDepositModal(null)
          }}
          onClose={() => setDepositModal(null)}
        />
      )}
      {lostModal && (
        <LostModal
          card={lostModal}
          onConfirm={(id, reason) => {
            doMove(id, 'LOST', undefined, reason)
            setLostModal(null)
          }}
          onClose={() => setLostModal(null)}
        />
      )}

      <ClientEditModal
        clientId={editingId}
        onClose={() => setEditingId(null)}
        onChanged={() => load()}
      />
    </Main>
  )
}