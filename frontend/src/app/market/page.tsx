'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, ChangeBadge, Table, Spinner, formatPrice } from '@/components/ui'
import { api } from '@/lib/api'

interface Asset {
  id: string
  ticker: string
  name: string
  type: string
  market: string
  exchange: string
  sector: string
  currency: string
  quote: {
    price: number
    changePct1D: number
    changePct5D: number | null
    changePct30D: number | null
    volume: string | null
    marketCap: string | null
  } | null
}

interface AssetsResponse {
  assets: Asset[]
  total: number
}

const COLUMNS = ['Ticker', 'Nome', 'Preço', '1D', '5D', '30D', 'Volume', 'Market Cap', 'Setor']

export default function MarketPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('')
  const params = new URLSearchParams()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (search) params.set('search', search)
      else params.delete('search')
      if (sector) params.set('sector', sector)
      else params.delete('sector')
      const data = await api.get<AssetsResponse>(`/market?${params.toString()}`)
      setAssets(data.assets)
      setTotal(data.total)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, sector])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const displayAssets = assets.filter((a) => ['STOCK', 'CRYPTO', 'FOREX', 'ETF', 'INDEX'].includes(a.type) && a.quote)

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white">Mercado</h1>
        <p className="text-sm text-gray-500">Todos os ativos</p>
      </header>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar ticker ou nome..."
          className="flex-1 min-w-40 bg-market-card border border-market-border rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-market-accent"
        />
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="bg-market-card border border-market-border rounded-md px-3 py-2 text-sm text-gray-300"
        >
          <option value="">Todos os setores</option>
          <option value="Technology">Technology</option>
          <option value="Financial">Financial</option>
          <option value="Energy">Energy</option>
          <option value="Healthcare">Healthcare</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">{total} resultados</p>
          </div>
          <Table headers={COLUMNS}>
            {displayAssets.map((a) => (
              <tr key={`${a.ticker}-${a.type}`} className="hover:bg-market-bg">
                <td className="px-3 py-2 font-semibold text-gray-200 whitespace-nowrap">{a.ticker}</td>
                <td className="px-3 py-2 text-gray-400">{a.name}</td>
                <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{formatPrice(a.quote?.price, a.currency)}</td>
                <td className="px-3 py-2"><ChangeBadge value={a.quote?.changePct1D} /></td>
                <td className="px-3 py-2"><ChangeBadge value={a.quote?.changePct5D} /></td>
                <td className="px-3 py-2"><ChangeBadge value={a.quote?.changePct30D} /></td>
                <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{a.quote?.volume || '—'}</td>
                <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{a.quote?.marketCap || '—'}</td>
                <td className="px-3 py-2 text-gray-500">{a.sector || '—'}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </Main>
  )
}