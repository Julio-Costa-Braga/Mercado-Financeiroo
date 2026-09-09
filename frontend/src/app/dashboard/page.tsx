'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Main } from '@/components/layout'
import { Card, ChangeBadge, StatusBadge, Spinner, formatPrice, timeAgo, PageHeader, Button } from '@/components/ui'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

interface QuoteItem {
  ticker: string
  name: string
  type: string
  price: number
  changePct1D: number
  updatedAt?: string
}

interface DashboardData {
  lastUpdated?: string
  marketUpdatedAt?: string
  marketNow: QuoteItem[]
  topGainers: Array<{ ticker: string; changePct: number; price: number; updatedAt?: string }>
  topLosers: Array<{ ticker: string; changePct: number; price: number; updatedAt?: string }>
  sectors: Array<{ name: string; count: number; avgChangePct: number; gainers: number; losers: number }>
  news: Array<{ id: string; title: string; source: string; publishedAt: string; sentiment: number }>
  priorityClients: Array<{ id: string; name: string; country: string; status: string; priorityScore: number; churnRisk: number }>
  tasksToday: Array<{ id: string; title: string; client: { name: string } | null; priority: string }>
}

function TypeLabel({ type }: { type: string }) {
  const colors: Record<string, string> = {
    STOCK: 'bg-blue-500/15 text-blue-400',
    CRYPTO: 'bg-amber-500/15 text-amber-400',
    FOREX: 'bg-emerald-500/15 text-emerald-400',
    ETF: 'bg-purple-500/15 text-purple-400',
    INDEX: 'bg-cyan-500/15 text-cyan-400',
  }
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors[type] || 'bg-gray-500/15 text-gray-400'}`}>
      {type}
    </span>
  )
}

function SectionTitle({ title, updatedAt, accent = false }: { title: string; updatedAt?: string; accent?: boolean }) {
  const { t, locale } = useI18n()
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <h3 className={`text-sm font-semibold ${accent ? 'text-white' : 'text-gray-200'}`}>{title}</h3>
      {updatedAt && (
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 shrink-0" title={updatedAt}>
          <span className={`w-1.5 h-1.5 rounded-full ${accent ? 'bg-emerald-400 animate-pulse' : 'bg-market-accent'}`} />
          {t('dashboard.updated')} {timeAgo(updatedAt, locale)}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    try {
      const data = await api.get<DashboardData>('/dashboard')
      setData(data)
      setLastFetched(new Date())
      setError('')
    } catch (err: any) {
      if (!silent) setError(err.message)
      if (err.message === 'Não autorizado') router.push('/login')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  // First load
  useEffect(() => {
    load()
  }, [load])

  // Clock for live "updated" badge + auto-refresh every 60s
  useEffect(() => {
    const refresh = setInterval(() => load(true), 60_000)
    timerRef.current = refresh
    return () => {
      clearInterval(refresh)
    }
  }, [load])

  if (loading) return <Main><Spinner /></Main>

  const marketUpdated = data?.marketUpdatedAt || data?.lastUpdated
  const quoteAt = (q?: { updatedAt?: string }) => q?.updatedAt ? timeAgo(q.updatedAt, locale) : timeAgo(marketUpdated, locale)

  return (
    <Main>
      {/* Header */}
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <>
            {marketUpdated && (
              <div className="flex items-center gap-2 bg-market-card border border-market-border rounded-xl px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="text-xs">
                  <p className="text-gray-300 font-medium">
                    {t('dashboard.updated')} {timeAgo(marketUpdated, locale)}
                  </p>
                  <p className="text-gray-600 text-[10px] mt-0.5">
                    {t('dashboard.marketNow')} · {timeAgo(lastFetched || new Date(), locale)}
                  </p>
                </div>
              </div>
            )}
            <Button onClick={() => load(true)} disabled={refreshing} variant="ghost">
              <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? '...' : '↻'}
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 text-xs text-market-down bg-market-down/10 border border-market-down/20 rounded-lg px-3 py-2.5">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* MARKET NOW */}
        <div className="md:col-span-2 xl:col-span-3">
          <Card className="bg-gradient-to-br from-market-card to-[#0d1526] border-market-border/80">
            <SectionTitle title={t('dashboard.marketNow')} updatedAt={marketUpdated} accent />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {data?.marketNow.slice(0, 6).map((m) => (
                <div key={m.ticker} className="bg-market-bg/60 border border-market-border rounded-xl p-3 hover:border-market-accent/40 transition-colors group">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-300">{m.ticker}</p>
                    <TypeLabel type={m.type} />
                  </div>
                  <p className="text-lg font-bold text-white mt-1.5 tabular-nums">{formatPrice(m.price)}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <ChangeBadge value={m.changePct1D} />
                    <span className="text-[9px] text-gray-600 group-hover:text-gray-500" title={m.updatedAt}>
                      {quoteAt(m)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* TOP GAINERS */}
        <Card>
          <SectionTitle title={t('dashboard.topGainers')} updatedAt={data?.topGainers[0]?.updatedAt} />
          <div className="space-y-2.5">
            {data?.topGainers.map((g) => (
              <div key={g.ticker} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-300 w-16">{g.ticker}</span>
                <span className="text-sm text-gray-500 tabular-nums flex-1">{formatPrice(g.price)}</span>
                <ChangeBadge value={g.changePct} />
              </div>
            ))}
          </div>
        </Card>

        {/* TOP LOSERS */}
        <Card>
          <SectionTitle title={t('dashboard.topLosers')} updatedAt={data?.topLosers[0]?.updatedAt} />
          <div className="space-y-2.5">
            {data?.topLosers.map((g) => (
              <div key={g.ticker} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-300 w-16">{g.ticker}</span>
                <span className="text-sm text-gray-500 tabular-nums flex-1">{formatPrice(g.price)}</span>
                <ChangeBadge value={g.changePct} />
              </div>
            ))}
          </div>
        </Card>

        {/* SECTORES */}
        <Card>
          <SectionTitle title={t('dashboard.sectors')} updatedAt={marketUpdated} />
          <div className="space-y-2">
            {data?.sectors.slice(0, 6).map((s) => (
              <div key={s.name} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300 truncate">{s.name}</span>
                    <span className="text-xs text-gray-500 tabular-nums">{s.gainers}/{s.losers}</span>
                  </div>
                  <div className="h-1.5 bg-market-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.avgChangePct >= 0 ? 'bg-market-up' : 'bg-market-down'}`}
                      style={{ width: `${Math.min(100, Math.abs(s.avgChangePct) * 12)}%` }}
                    />
                  </div>
                </div>
                <ChangeBadge value={s.avgChangePct} />
              </div>
            ))}
          </div>
        </Card>

        {/* CLIENTES PRIORITÁRIOS */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-200">{t('dashboard.clients')}</h3>
            <Link href="/clients" className="text-xs text-market-accent hover:underline">{t('dashboard.seeAll')}</Link>
          </div>
          <div className="space-y-2">
            {data?.priorityClients.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between hover:bg-market-bg/60 rounded-lg p-1.5 -m-1.5 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-300 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.country}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={c.status} />
                  <span className="text-xs font-mono text-gray-400">{c.priorityScore}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* NOTÍCIAS */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-200">{t('dashboard.news')}</h3>
            <Link href="/news" className="text-xs text-market-accent hover:underline">{t('dashboard.seeAll')}</Link>
          </div>
          <div className="space-y-3">
            {data?.news.slice(0, 5).map((n) => (
              <div key={n.id} className="border-b border-market-border pb-2.5 last:border-0">
                <p className="text-sm text-gray-300 line-clamp-2">{n.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-gray-500">{n.source}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-gray-600" />
                  <span className="text-xs text-gray-600">{timeAgo(n.publishedAt, locale)}</span>
                  {n.sentiment !== null && n.sentiment !== undefined && (
                    <span className={`text-xs ml-auto ${n.sentiment >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                      {n.sentiment >= 0 ? '+' : ''}{n.sentiment.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* TAREFAS */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-200">{t('dashboard.tasks')}</h3>
            <Link href="/tasks" className="text-xs text-market-accent hover:underline">{t('dashboard.seeAll')}</Link>
          </div>
          <div className="space-y-2">
            {data?.tasksToday.map((task) => (
              <div key={task.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-gray-300 truncate">{task.title}</p>
                  <p className="text-xs text-gray-500">{task.client?.name || '—'}</p>
                </div>
                <StatusBadge status={task.priority} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Main>
  )
}