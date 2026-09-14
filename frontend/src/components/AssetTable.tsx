'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, ChangeBadge, Table, Spinner, formatBigNumber, formatPrice } from '@/components/ui'
import { api } from '@/lib/api'

interface Asset {
  id: string
  ticker: string
  name: string
  market: string
  exchange: string
  sector: string
  currency: string
  quote: {
    price: number
    bid: number | null
    ask: number | null
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

export default function AssetTable({ title, type }: { title: string; type: string }) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type, limit: '50' })
      if (search) params.set('search', search)
      const data = await api.get<AssetsResponse>(`/market?${params.toString()}`)
      setAssets(data.assets.filter((a) => a.quote))
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, type])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const columns = type === 'FOREX'
    ? ['Par', 'Nome', 'Preço', 'Bid', 'Ask', 'Spread', '1D', '30D']
    : ['Ticker', 'Nome', 'Preço', '1D', '5D', '30D', 'Volume', 'Market Cap', 'Setor']

  return (
    <Main>
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{title}</h1>
            <p className="text-sm text-gray-500">Ativos do tipo {type}</p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Pesquisar ${title}...`}
            className="bg-market-card border border-market-border rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-market-accent w-56"
          />
        </div>
      </header>

      {loading ? (
        <Spinner />
      ) : (
        <Card>
          <Table headers={columns}>
            {assets.map((a) => {
              const q = a.quote!
              return (
                <tr key={a.id} className="hover:bg-market-bg">
                  <td className="px-3 py-2 font-semibold text-gray-200 whitespace-nowrap">{a.ticker}</td>
                  <td className="px-3 py-2 text-gray-400">{a.name}</td>
                  <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{formatPrice(q.price, a.currency)}</td>
                  {type === 'FOREX' ? (
                    <>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{q.bid?.toFixed(5) || '—'}</td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{q.ask?.toFixed(5) || '—'}</td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                        {q.bid && q.ask ? (q.ask - q.bid).toFixed(5) : '—'}
                      </td>
                    </>
                  ) : (
                    <td className="px-3 py-2"><ChangeBadge value={q.changePct1D} /></td>
                  )}
                  <td className="px-3 py-2"><ChangeBadge value={q.changePct1D} /></td>
                  {type !== 'FOREX' && <td className="px-3 py-2"><ChangeBadge value={q.changePct5D} /></td>}
                  <td className="px-3 py-2"><ChangeBadge value={q.changePct30D} /></td>
                  {type !== 'FOREX' && (
                    <>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{formatBigNumber(q.volume)}</td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{formatBigNumber(q.marketCap)}</td>
                      <td className="px-3 py-2 text-gray-500">{a.sector || '—'}</td>
                    </>
                  )}
                </tr>
              )
            })}
          </Table>
        </Card>
      )}
    </Main>
  )
}