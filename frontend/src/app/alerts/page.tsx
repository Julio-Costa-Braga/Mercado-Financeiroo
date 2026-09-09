'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Button, Card, EmptyState, Field, PageHeader, Spinner, formatDate, inputCls, selectCls } from '@/components/ui'
import { api } from '@/lib/api'

interface Alert {
  id: string
  type: string
  condition: string
  threshold: number | null
  status: string
  triggeredAt: string | null
  client: { id: string; name: string } | null
  asset: { id: string; ticker: string; name: string } | null
  createdAt: string
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ type: 'PRICE', condition: '<', threshold: '', assetId: '' })
  const [searchAsset, setSearchAsset] = useState('')
  const [assetResults, setAssetResults] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ alerts: Alert[] }>('/alerts')
      setAlerts(data.alerts)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function searchAssets(q: string) {
    setSearchAsset(q)
    if (!q.trim()) { setAssetResults([]); return }
    const data = await api.get<{ assets: any[] }>(`/market?search=${encodeURIComponent(q)}&limit=8`)
    setAssetResults(data.assets)
  }

  async function createAlert(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/alerts', {
      type: form.type,
      condition: form.condition,
      threshold: form.threshold ? parseFloat(form.threshold) : undefined,
      assetId: form.assetId || undefined,
    })
    setForm({ type: 'PRICE', condition: '<', threshold: '', assetId: '' })
    setSearchAsset('')
    setAssetResults([])
    load()
  }

  async function toggleAlert(a: Alert) {
    await api.put(`/alerts/${a.id}`, { status: a.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' })
    load()
  }

  const typeStyles: Record<string, string> = {
    MARKET: 'bg-purple-500/10 text-purple-400',
    PRICE: 'bg-blue-500/10 text-blue-400',
    VOLUME: 'bg-teal-500/10 text-teal-400',
    CLIENT: 'bg-orange-500/10 text-orange-400',
    WITHDRAWAL: 'bg-red-500/10 text-red-400',
  }

  return (
    <Main>
      <PageHeader title="Alertas" subtitle="Regras de mercado, preço e clientes" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Novo alerta">
          <form onSubmit={createAlert} className="space-y-3">
            <Field label="Tipo">
              <select className={selectCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="PRICE">Price Alert</option>
                <option value="MARKET">Market Alert</option>
                <option value="VOLUME">Volume Alert</option>
                <option value="CLIENT">Client Alert</option>
              </select>
            </Field>

            {(form.type === 'MARKET' || form.type === 'VOLUME') && (
              <Field label="Condição">
                <select className={selectCls} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                  <option value="<">Menor que</option>
                  <option value=">">Maior que</option>
                  <option value="drop3x">Queda &gt; 3%</option>
                </select>
              </Field>
            )}

            <Field label="Buscar ativo">
              <input
                value={searchAsset}
                onChange={(e) => searchAssets(e.target.value)}
                placeholder="ex: BTC, NVDA"
                className={inputCls}
              />
              {assetResults.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {assetResults.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { setForm({ ...form, assetId: a.id }); setSearchAsset(a.ticker); setAssetResults([]) }}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm ${form.assetId === a.id ? 'bg-market-accent/20 text-market-accent' : 'bg-market-bg hover:bg-market-border text-gray-300'}`}
                    >
                      {a.ticker} - {a.name}
                    </button>
                  ))}
                </div>
              )}
            </Field>

            <Field label="Limite">
              <input type="number" step="any" className={inputCls} value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} placeholder="100" />
            </Field>

            <Button type="submit" className="w-full">Criar alerta</Button>
          </form>
        </Card>

        <div className="lg:col-span-2">
          <Card title={`Alertas ativos (${alerts.length})`}>
            {loading ? (
              <Spinner />
            ) : (
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div key={a.id} className="bg-market-bg/70 border border-market-border rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${typeStyles[a.type] || 'bg-gray-500/10 text-gray-400'}`}>{a.type}</span>
                        <span className={`text-xs ${a.status === 'TRIGGERED' ? 'text-market-down' : 'text-gray-400'}`}>{a.status}</span>
                      </div>
                      <p className="text-sm text-gray-200 mt-1 font-medium">
                        {a.asset ? `${a.asset.ticker} ${a.condition} ${a.threshold}` : a.client ? `Cliente: ${a.client.name}` : `${a.type} ${a.condition} ${a.threshold ?? ''}`}
                      </p>
                      <p className="text-xs text-gray-600">Criado em {formatDate(a.createdAt)}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toggleAlert(a)}>
                      {a.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                ))}
                {alerts.length === 0 && <EmptyState title="Nenhum alerta" description="Crie um alerta para acompanhar o mercado." />}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Main>
  )
}