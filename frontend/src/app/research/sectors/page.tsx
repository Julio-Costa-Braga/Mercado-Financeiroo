'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, ChangeBadge, Spinner, formatBigNumber } from '@/components/ui'
import { api } from '@/lib/api'

interface SectorPerformance {
  name: string
  count: number
  avgChangePct: number
  gainers: number
  losers: number
  marketCap: bigint | number
}

export default function SectorsPage() {
  const [sectors, setSectors] = useState<SectorPerformance[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ sectors: SectorPerformance[] }>('/market/sectors/performance')
      setSectors(data.sectors)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const total = sectors.reduce((a, s) => a + s.count, 0) || 1
  const maxCap = sectors.reduce((a, s) => Math.max(a, Number(s.marketCap) || 0), 0) || 1

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white">Setores</h1>
        <p className="text-sm text-gray-500">Performance agregada por setor de mercado</p>
      </header>

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {sectors.map((s) => {
            const width = Math.max(6, Math.round((s.count / total) * 100))
            const capWidth = Math.max(4, Math.round((Number(s.marketCap) / maxCap) * 100))
            return (
              <Card key={s.name}>
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-200">{s.name}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500">{s.count} ativos</span>
                        <ChangeBadge value={s.avgChangePct} />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-1.5 bg-market-border rounded-full overflow-hidden">
                        <div className="h-full bg-market-accent/70 rounded-full" style={{ width: `${width}%` }} />
                      </div>
                      <div className="flex-1 h-1.5 bg-market-border rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.avgChangePct >= 0 ? 'bg-market-up' : 'bg-market-down'}`}
                          style={{ width: `${capWidth}%`, opacity: 0.6 }}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1">
                      Market Cap: {formatBigNumber(Number(s.marketCap))} · {s.gainers}↑ {s.losers}↓
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
          {sectors.length === 0 && <p className="text-sm text-gray-500 text-center py-8">Nenhum setor disponível.</p>}
        </div>
      )}
    </Main>
  )
}