'use client'
import React, { useCallback, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, ChangeBadge, Spinner, Table } from '@/components/ui'
import { api } from '@/lib/api'

interface ScreenerResult {
  id: string
  ticker: string
  name: string
  sector: string
  industry: string
  price: number
  changePct1D: number
  changePct5D: number
  changePct30D: number
  volume?: string
  marketCap?: string
  peRatio?: number
  psRatio?: number
  pbRatio?: number
  evEbitda?: number
  roe?: number
}

export default function ResearchPage() {
  const [results, setResults] = useState<ScreenerResult[]>([])
  const [loading, setLoading] = useState(false)
  const [ran, setRan] = useState(false)
  const [filters, setFilters] = useState({
    sector: 'Technology',
    maxChange1D: '',
    minMarketCap: '',
    maxPe: '',
    minRoe: '',
    search: '',
  })

  const runScreener = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: 'STOCK' })
      if (filters.sector) params.set('sector', filters.sector)
      if (filters.maxChange1D) params.set('maxChange1D', filters.maxChange1D)
      if (filters.search) params.set('search', filters.search)
      if (filters.maxPe) params.set('maxPe', filters.maxPe)
      if (filters.minRoe) params.set('minRoe', filters.minRoe)

      if (filters.minMarketCap) {
        const mc = parseFloat(filters.minMarketCap)
        const bucket = mc >= 200_000_000_000 ? 'mega' : mc >= 10_000_000_000 ? 'large' : mc >= 2_000_000_000 ? 'mid' : mc >= 300_000_000 ? 'small' : 'micro'
        params.set('marketCapBucket', bucket)
      }

      const data = await api.get<{ results: ScreenerResult[]; count: number }>(`/screener?${params.toString()}`)
      setResults(data.results)
      setRan(true)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  const input = 'bg-market-bg border border-market-border rounded-md px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-market-accent'

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white">Research / Screener</h1>
        <p className="text-sm text-gray-500">Encontre ativos por critérios</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card title="Filtros" className="lg:col-span-1 h-fit">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Setor</label>
              <select className={input + ' w-full'} value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })}>
                <option value="">Todos</option>
                <option value="Technology">Technology</option>
                <option value="Financial">Financial</option>
                <option value="Energy">Energy</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Industrial">Industrial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Queda máx. 1D (%)</label>
              <input className={input + ' w-full'} type="number" value={filters.maxChange1D} onChange={(e) => setFilters({ ...filters, maxChange1D: e.target.value })} placeholder="ex: -3" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Market Cap mín. (B)</label>
              <input className={input + ' w-full'} type="number" value={filters.minMarketCap} onChange={(e) => setFilters({ ...filters, minMarketCap: e.target.value })} placeholder="ex: 10" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">P/E máx.</label>
              <input className={input + ' w-full'} type="number" value={filters.maxPe} onChange={(e) => setFilters({ ...filters, maxPe: e.target.value })} placeholder="ex: 30" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">ROE mín. (%)</label>
              <input className={input + ' w-full'} type="number" value={filters.minRoe} onChange={(e) => setFilters({ ...filters, minRoe: e.target.value })} placeholder="ex: 15" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Buscar</label>
              <input className={input + ' w-full'} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="ticker ou nome" />
            </div>

            <button
              onClick={runScreener}
              disabled={loading}
              className="w-full bg-market-accent text-white text-sm font-medium py-2 rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </Card>

        <Card title={ran ? `Resultados (${results.length})` : 'Resultados'} className="lg:col-span-3">
          {loading ? (
            <Spinner />
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">Ajuste os filtros e clique em Buscar.</p>
          ) : (
            <Table headers={['Ticker', 'Nome', 'Preço', '1D', '5D', '30D', 'Volume', 'P/E', 'ROE']}>
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-market-bg">
                  <td className="px-3 py-2 font-semibold text-gray-200">{r.ticker}</td>
                  <td className="px-3 py-2 text-gray-400">{r.name}</td>
                  <td className="px-3 py-2 text-white whitespace-nowrap">{r.price?.toFixed(2)}</td>
                  <td className="px-3 py-2"><ChangeBadge value={r.changePct1D} /></td>
                  <td className="px-3 py-2"><ChangeBadge value={r.changePct5D} /></td>
                  <td className="px-3 py-2"><ChangeBadge value={r.changePct30D} /></td>
                  <td className="px-3 py-2 text-gray-400">{r.volume || '—'}</td>
                  <td className="px-3 py-2 text-gray-400">{r.peRatio?.toFixed(1) || '—'}</td>
                  <td className="px-3 py-2 text-gray-400">{r.roe?.toFixed(1) || '—'}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </Main>
  )
}