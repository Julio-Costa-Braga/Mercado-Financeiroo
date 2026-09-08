'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, Spinner, StatusBadge, formatDate } from '@/components/ui'
import { api } from '@/lib/api'

interface Integration {
  id: string
  provider: string
  type: string
  status: string
  plan: string | null
  lastSyncAt: string | null
}

interface IntegrationHealth {
  id: string
  provider: string
  type: string
  status: string
  latencyMs: number | null
  lastCheckAt: string
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [health, setHealth] = useState<IntegrationHealth[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ integrations: Integration[]; health: IntegrationHealth[] }>('/integrations')
      setIntegrations(data.integrations)
      setHealth(data.health)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const providers = [...new Set(integrations.map((i) => i.provider))]
  const byProvider = (p: string) => integrations.filter((i) => i.provider === p)

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white">Integrações</h1>
        <p className="text-sm text-gray-500">Provedores de dados e conexões externas</p>
      </header>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {providers.map((p) => (
              <Card key={p} title={p}>
                <div className="space-y-2.5">
                  {byProvider(p).map((i) => (
                    <div key={i.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-300">{i.type}</p>
                        <p className="text-xs text-gray-500">
                          {i.plan || '—'} {i.lastSyncAt ? `· sync ${formatDate(i.lastSyncAt)}` : ''}
                        </p>
                      </div>
                      <StatusBadge status={i.status} />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            {providers.length === 0 && <p className="text-gray-500 text-sm">Nenhuma integração configurada.</p>}
          </div>

          <Card title="Saúde das integrações">
            <div className="space-y-2">
              {health.map((h) => (
                <div key={h.id} className="flex items-center gap-3 text-sm">
                  <span className={`w-2 h-2 rounded-full ${h.status === 'UP' ? 'bg-market-up' : h.status === 'DOWN' ? 'bg-market-down' : 'bg-amber-400'}`} />
                  <span className="text-gray-300 w-40">{h.provider}</span>
                  <span className="text-xs text-gray-500">{h.type}</span>
                  {h.latencyMs != null && <span className="text-xs text-gray-500 ml-auto">{h.latencyMs}ms</span>}
                  <span className="text-xs text-gray-600">{formatDate(h.lastCheckAt)}</span>
                </div>
              ))}
              {health.length === 0 && <p className="text-gray-500 text-sm">Sem registros de saúde.</p>}
            </div>
          </Card>
        </>
      )}
    </Main>
  )
}