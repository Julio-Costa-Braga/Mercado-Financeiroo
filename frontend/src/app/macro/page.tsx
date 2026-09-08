'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, Spinner } from '@/components/ui'
import { api } from '@/lib/api'

interface Observation {
  value: number
  period: string
  previous: number | null
}

interface Indicator {
  id: string
  code: string
  name: string
  country: string
  region: string
  frequency: string
  unit: string | null
  description: string | null
  observations: Observation[]
}

export default function MacroPage() {
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [loading, setLoading] = useState(true)
  const [country, setCountry] = useState('')
  const [countries, setCountries] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (country) params.set('country', country)
      const data = await api.get<{ indicators: Indicator[] }>(`/macro?${params.toString()}`)
      setIndicators(data.indicators)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [country])

  useEffect(() => {
    api.get<{ countries: string[] }>('/macro/regions').then((d) => setCountries(d.countries)).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white">Macroeconomia</h1>
        <p className="text-sm text-gray-500">Indicadores econômicos por país</p>
      </header>

      <div className="flex gap-3 mb-4">
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-market-card border border-market-border rounded-md px-3 py-2 text-sm text-gray-300">
          <option value="">Todos os países</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {indicators.map((ind) => {
            const latest = ind.observations[0]
            return (
              <Card key={ind.id} title={ind.name}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-gray-500">{ind.country} · {ind.region}</span>
                      <p className="text-xs text-gray-600">{ind.frequency}</p>
                    </div>
                    <span className="text-xs bg-market-bg border border-market-border px-2 py-0.5 rounded text-gray-300">
                      {ind.code}
                    </span>
                  </div>

                  {latest ? (
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {latest.value.toFixed(2)}
                        {ind.unit && <span className="text-sm text-gray-500 ml-1">{ind.unit}</span>}
                      </div>
                      <div className="text-xs">
                        {latest.previous != null && (
                          <span className="text-gray-500">
                            Prev: {latest.previous.toFixed(2)} ·{' '}
                            <span className={latest.value >= latest.previous ? 'text-market-up' : 'text-market-down'}>
                              {((latest.value / latest.previous - 1) * 100).toFixed(2)}%
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Sem dados</p>
                  )}

                  {ind.observations.length > 1 && (
                    <div className="pt-2 border-t border-market-border">
                      <p className="text-xs text-gray-500 mb-1.5">Histórico recente</p>
                      <div className="flex items-end gap-1 h-12">
                        {[...ind.observations].reverse().slice(-10).map((o, i) => {
                          const min = Math.min(...ind.observations.slice(0, 10).map((x) => x.value))
                          const max = Math.max(...ind.observations.slice(0, 10).map((x) => x.value))
                          const h = max !== min ? ((o.value - min) / (max - min)) * 100 : 50
                          return (
                            <div
                              key={i}
                              title={`${o.value.toFixed(2)} (${new Date(o.period).toLocaleDateString('pt-PT')})`}
                              className="flex-1 rounded-t"
                              style={{ height: `${Math.max(8, h)}%`, background: h >= 100 ? '#16a34a' : '#f59e0b' }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
          {indicators.length === 0 && <p className="text-sm text-gray-500 col-span-full text-center py-8">Nenhum indicador encontrado.</p>}
        </div>
      )}
    </Main>
  )
}