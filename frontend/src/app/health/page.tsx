'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, Spinner } from '@/components/ui'
import { api } from '@/lib/api'

interface Service {
  name: string
  status: 'up' | 'down' | 'degraded'
  latencyMs?: number
  detail?: string
}

interface HealthReport {
  overall: string
  timestamp: string
  services: Service[]
  integrations: Array<{ provider: string; type: string; status: string; lastSyncAt: string | null }>
}

function statusDot(s: string) {
  return s === 'up' ? 'bg-market-up' : s === 'degraded' ? 'bg-amber-400' : 'bg-market-down'
}

export default function HealthPage() {
  const [report, setReport] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<HealthReport>('/health/overview')
      setReport(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  return (
    <Main>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Observabilidade</h1>
          <p className="text-sm text-gray-500">Estado dos serviços</p>
        </div>
        <button onClick={load} className="text-xs text-market-accent hover:opacity-80">Atualizar</button>
      </header>

      {loading ? (
        <Spinner />
      ) : report ? (
        <>
          <Card className="mb-4">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                report.overall === 'healthy' ? 'bg-market-up/10 text-market-up' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {report.overall}
              </span>
              <span className="text-xs text-gray-500">Checado em {new Date(report.timestamp).toLocaleTimeString('pt-PT')}</span>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {report.services.map((s) => (
              <Card key={s.name}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{s.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {s.latencyMs != null ? `${s.latencyMs}ms` : ''}
                      {s.detail ? ` · ${s.detail}` : ''}
                    </p>
                  </div>
                  <span className={`w-2.5 h-2.5 mt-1 rounded-full ${statusDot(s.status)}`} />
                </div>
              </Card>
            ))}
          </div>

          <Card title="Integrações conectadas">
            <div className="flex flex-wrap gap-2">
              {report.integrations.map((i, idx) => (
                <span key={idx} className="text-xs bg-market-bg border border-market-border px-2.5 py-1 rounded text-gray-300">
                  {i.provider} · {i.status}
                  {i.lastSyncAt ? ` · ${new Date(i.lastSyncAt).toLocaleDateString('pt-PT')}` : ''}
                </span>
              ))}
              {report.integrations.length === 0 && <p className="text-sm text-gray-500">Nenhuma integração.</p>}
            </div>
          </Card>
        </>
      ) : (
        <p className="text-sm text-gray-500 text-center py-8">Não foi possível carregar o estado dos serviços.</p>
      )}
    </Main>
  )
}