'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Main } from '@/components/layout'
import { Card, ChangeBadge, StatusBadge, Spinner, formatDate, formatPrice } from '@/components/ui'
import { api } from '@/lib/api'

interface DashboardData {
  marketNow: Array<{ ticker: string; name: string; type: string; price: number; changePct1D: number }>
  topGainers: Array<{ ticker: string; changePct: number; price: number }>
  topLosers: Array<{ ticker: string; changePct: number; price: number }>
  sectors: Array<{ name: string; changePct: number }>
  news: Array<{ id: string; title: string; source: string; publishedAt: string; sentiment: number }>
  priorityClients: Array<{ id: string; name: string; country: string; status: string; priorityScore: number; churnRisk: number }>
  tasksToday: Array<{ id: string; title: string; client: { name: string } | null; priority: string }>
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await api.get<DashboardData>('/dashboard')
      setData(data)
    } catch (err: any) {
      setError(err.message)
      if (err.message === 'Não autorizado') router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Main><Spinner /></Main>

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500">Visão geral do mercado e operação</p>
      </header>

      {error && <p className="text-market-down text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* MARKET NOW */}
        <Card title="Market Now" className="xl:col-span-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {data?.marketNow.slice(0, 6).map((m) => (
              <div key={m.ticker} className="bg-market-bg rounded-md p-3 border border-market-border">
                <p className="text-xs font-semibold text-gray-300">{m.ticker}</p>
                <p className="text-base font-bold text-white mt-1">{formatPrice(m.price)}</p>
                <ChangeBadge value={m.changePct1D} />
              </div>
            ))}
          </div>
        </Card>

        {/* TOP GAINERS */}
        <Card title="Top Gainers">
          <div className="space-y-2">
            {data?.topGainers.map((g) => (
              <div key={g.ticker} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">{g.ticker}</span>
                <span className="text-sm text-gray-500">{formatPrice(g.price)}</span>
                <ChangeBadge value={g.changePct} />
              </div>
            ))}
          </div>
        </Card>

        {/* TOP LOSERS */}
        <Card title="Top Losers">
          <div className="space-y-2">
            {data?.topLosers.map((g) => (
              <div key={g.ticker} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">{g.ticker}</span>
                <span className="text-sm text-gray-500">{formatPrice(g.price)}</span>
                <ChangeBadge value={g.changePct} />
              </div>
            ))}
          </div>
        </Card>

        {/* CLIENTES PRIORITÁRIOS */}
        <Card
          title="Clientes Prioritários"
          action={<Link href="/clients" className="text-xs text-market-accent">Ver todos</Link>}
        >
          <div className="space-y-2">
            {data?.priorityClients.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between hover:bg-market-bg rounded p-1">
                <div>
                  <p className="text-sm font-medium text-gray-300">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.country}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={c.status} />
                  <span className="text-xs font-mono text-gray-400">{c.priorityScore}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* NOTÍCIAS */}
        <Card
          title="Notícias"
          action={<Link href="/news" className="text-xs text-market-accent">Ver todas</Link>}
        >
          <div className="space-y-3">
            {data?.news.slice(0, 5).map((n) => (
              <div key={n.id} className="border-b border-market-border pb-2 last:border-0">
                <p className="text-sm text-gray-300 line-clamp-2">{n.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{n.source}</span>
                  <span className="text-xs text-gray-600">{formatDate(n.publishedAt)}</span>
                  {n.sentiment !== null && n.sentiment !== undefined && (
                    <span className={`text-xs ${n.sentiment >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                      {n.sentiment >= 0 ? '+' : ''}{n.sentiment.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* TAREFAS */}
        <Card
          title="Tarefas de Hoje"
          action={<Link href="/tasks" className="text-xs text-market-accent">Ver todas</Link>}
        >
          <div className="space-y-2">
            {data?.tasksToday.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">{t.title}</p>
                  <p className="text-xs text-gray-500">{t.client?.name || '—'}</p>
                </div>
                <StatusBadge status={t.priority} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Main>
  )
}