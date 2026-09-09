'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, EmptyState, PageHeader, Spinner, inputCls, selectCls } from '@/components/ui'
import { api } from '@/lib/api'

interface EconEvent {
  id: string
  date: string
  time: string | null
  country: string
  indicator: string
  impact: string
  forecast: number | null
  previous: number | null
  actual: number | null
  source: string | null
}

function impactColor(impact: string) {
  return impact === 'HIGH' ? 'bg-red-500/10 text-red-400' :
    impact === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'
}

export default function CalendarPage() {
  const [events, setEvents] = useState<EconEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [impact, setImpact] = useState('')
  const [day, setDay] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (impact) params.set('impact', impact)
      if (day) params.set('date', day)
      const data = await api.get<{ events: EconEvent[] }>(`/calendar?${params.toString()}`)
      setEvents(data.events)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [impact, day])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  const grouped = events.reduce<Record<string, EconEvent[]>>((acc, e) => {
    const key = e.date.slice(0, 10)
    ;(acc[key] ||= []).push(e)
    return acc
  }, {})

  return (
    <Main>
      <PageHeader
        title="Calendário Econômico"
        subtitle="Eventos macro por dia"
        actions={<span className="text-xs text-gray-500">Hoje: {new Date().toLocaleDateString('pt-PT')}</span>}
      />

      <div className="flex gap-3 mb-4">
        <input
          type="date"
          value={day || today}
          onChange={(e) => setDay(e.target.value)}
          className={`${inputCls} flex-1 max-w-64`}
        />
        <select value={impact} onChange={(e) => setImpact(e.target.value)} className={`${selectCls} max-w-44`}>
          <option value="">Impacto</option>
          <option value="HIGH">Alto</option>
          <option value="MEDIUM">Médio</option>
          <option value="LOW">Baixo</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          {Object.keys(grouped).length === 0 && (
            <EmptyState title="Nenhum evento" description="Nenhum evento para o período selecionado." />
          )}
          {Object.entries(grouped).map(([date, evts]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                {new Date(date).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' })}
              </h3>
              <div className="space-y-2">
                {evts.map((e) => (
                  <Card key={e.id}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-12">{e.time || '—'}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded w-20 text-center ${impactColor(e.impact)}`}>
                        {e.impact}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-200 font-medium">{e.indicator}</p>
                        <p className="text-xs text-gray-500">🇺🇳 {e.country} · {e.source || '—'}</p>
                      </div>
                      <div className="flex gap-4 text-xs text-right">
                        <div>
                          <p className="text-gray-500">Prev</p>
                          <p className="text-gray-300">{e.forecast ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Pós</p>
                          <p className="text-gray-300">{e.actual ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Ant</p>
                          <p className="text-gray-300">{e.previous ?? '—'}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Main>
  )
}