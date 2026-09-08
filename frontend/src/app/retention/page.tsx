'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { Card, Spinner, StatusBadge } from '@/components/ui'
import { api } from '@/lib/api'

interface RetentionClient {
  id: string
  name: string
  country: string | null
  status: string
  owner: string | undefined
  priorityScore: number
  breakdown: Array<{ reason: string; points: number }>
}

interface Workbench {
  critical: RetentionClient[]
  high: RetentionClient[]
  medium: RetentionClient[]
  low: RetentionClient[]
}

const LEVEL_STYLES: Record<string, { label: string; style: string; bg: string }> = {
  critical: { label: 'CRITICAL', style: 'text-market-down border-market-down/50', bg: 'bg-market-down/10' },
  high: { label: 'HIGH', style: 'text-orange-400 border-orange-400/50', bg: 'bg-orange-400/10' },
  medium: { label: 'MEDIUM', style: 'text-amber-400 border-amber-400/50', bg: 'bg-amber-400/10' },
  low: { label: 'LOW', style: 'text-gray-400 border-gray-400/50', bg: 'bg-gray-400/10' },
}

export default function RetentionPage() {
  const [wb, setWb] = useState<Workbench | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<Workbench>('/retention/workbench')
      setWb(data)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Main><Spinner /></Main>

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white">Retention Workbench</h1>
        <p className="text-sm text-gray-500">Centro da operação de retenção</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {(Object.keys(LEVEL_STYLES) as Array<'critical' | 'high' | 'medium' | 'low'>).map((level) => {
          const config = LEVEL_STYLES[level]
          const clients = wb?.[level] || []
          return (
            <Card key={level} className={config.bg} title={
              <span className={`${config.style} text-xs font-bold`}>{config.label} ({clients.length})</span>
            }>
              <div className="space-y-2">
                {clients.map((c) => (
                  <div key={c.id} className="bg-market-card border border-market-border rounded-md p-2">
                    <Link href={`/clients/${c.id}`} className="text-sm font-medium text-gray-200 hover:text-market-accent">
                      {c.name}
                    </Link>
                    <p className="text-xs text-gray-500">{c.country || '—'} · Owner: {c.owner || '—'}</p>
                    <p className="text-xs text-gray-400 mt-1">Score: <span className="font-mono">{c.priorityScore}</span></p>
                    <button
                      onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      className="text-xs text-market-accent mt-1 hover:underline"
                    >
                      {expanded === c.id ? 'Ocultar explicação' : 'Explicar score'}
                    </button>
                    {expanded === c.id && (
                      <div className="mt-2 space-y-1 bg-market-bg rounded p-2">
                        {c.breakdown.map((b) => (
                          <div key={b.reason} className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{b.reason}</span>
                            <span className="font-mono text-gray-300">+{b.points}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-xs border-t border-market-border pt-1">
                          <span className="text-gray-400 font-medium">Total</span>
                          <span className="font-mono text-white">{c.priorityScore}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {clients.length === 0 && <p className="text-xs text-gray-500">Nenhum cliente.</p>}
              </div>
            </Card>
          )
        })}
      </div>
    </Main>
  )
}