'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, ChangeBadge, Spinner, formatBigNumber, formatPrice } from '@/components/ui'
import { api } from '@/lib/api'

interface AssetLite {
  ticker: string
  name: string
}

interface DetailedAsset {
  id: string
  ticker: string
  name: string
  type: string
  currency: string
  sector: string | null
  quotes: Array<{ price: number; changePct1D: number | null; changePct5D: number | null; changePct30D: number | null; marketCap: bigint | null; volume: bigint | null }>
  fundamentals: Array<{ peRatio: number | null; eps: number | null; dividendYield: number | null; marketCap: bigint | null }>
}

const MAX = 4

export default function ComparePage() {
  const [assets, setAssets] = useState<AssetLite[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [details, setDetails] = useState<DetailedAsset[]>([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ assets: any[] }>('/market?type=STOCK&limit=100')
      setAssets(data.assets.map((a) => ({ ticker: a.ticker, name: a.name })))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (selected.length === 0) {
      setDetails([])
      return
    }
    let active = true
    Promise.all(selected.map((t) => api.get<{ asset: DetailedAsset }>(`/market/${t}`)))
      .then((res) => {
        if (active) setDetails(res.map((r) => r.asset))
      })
      .catch(console.error)
    return () => {
      active = false
    }
  }, [selected])

  function toggle(ticker: string) {
    setSelected((prev) =>
      prev.includes(ticker) ? prev.filter((t) => t !== ticker) : prev.length >= MAX ? prev : [...prev, ticker]
    )
  }

  const q = (d: DetailedAsset) => d.quotes[0]
  const f = (d: DetailedAsset) => d.fundamentals[0]

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white">Comparador de Ativos</h1>
        <p className="text-sm text-gray-500">Compare até {MAX} ações lado a lado</p>
      </header>

      <Card className="mb-4" title="Selecionar ativos">
        <div className="flex flex-wrap gap-2">
          {assets.map((a) => {
            const on = selected.includes(a.ticker)
            const disabled = !on && selected.length >= MAX
            return (
              <button
                key={a.ticker}
                onClick={() => toggle(a.ticker)}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-md text-xs border transition ${
                  on
                    ? 'bg-market-accent/20 text-market-accent border-market-accent/40'
                    : 'bg-market-bg border-market-border text-gray-400 hover:text-white disabled:opacity-40'
                }`}
              >
                {a.ticker}
              </button>
            )
          })}
        </div>
      </Card>

      {loading ? (
        <Spinner />
      ) : details.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-market-border text-left">
                  <th className="px-3 py-2 text-xs font-medium text-gray-400">Métrica</th>
                  {details.map((d) => (
                    <th key={d.id} className="px-3 py-2">
                      <p className="text-sm font-semibold text-gray-200">{d.ticker}</p>
                      <p className="text-xs font-normal text-gray-500">{d.name}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-market-border">
                <tr>
                  <td className="px-3 py-2 text-gray-400">Preço</td>
                  {details.map((d) => (
                    <td key={d.id} className="px-3 py-2 text-white font-medium">{formatPrice(q(d)?.price, d.currency)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-400">Variação 1D</td>
                  {details.map((d) => (
                    <td key={d.id} className="px-3 py-2"><ChangeBadge value={q(d)?.changePct1D} /></td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-400">Variação 5D</td>
                  {details.map((d) => (
                    <td key={d.id} className="px-3 py-2"><ChangeBadge value={q(d)?.changePct5D} /></td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-400">Variação 30D</td>
                  {details.map((d) => (
                    <td key={d.id} className="px-3 py-2"><ChangeBadge value={q(d)?.changePct30D} /></td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-400">Volume</td>
                  {details.map((d) => (
                    <td key={d.id} className="px-3 py-2 text-gray-400">{formatBigNumber(q(d)?.volume ? Number(q(d)!.volume) : null)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-400">Market Cap</td>
                  {details.map((d) => (
                    <td key={d.id} className="px-3 py-2 text-gray-400">{formatBigNumber(Number(f(d)?.marketCap ?? q(d)?.marketCap ?? null))}</td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-400">P/L</td>
                  {details.map((d) => (
                    <td key={d.id} className="px-3 py-2 text-gray-400">{f(d)?.peRatio?.toFixed(1) ?? '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-400">EPS</td>
                  {details.map((d) => (
                    <td key={d.id} className="px-3 py-2 text-gray-400">{f(d)?.eps?.toFixed(2) ?? '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-400">Dividend Yield</td>
                  {details.map((d) => (
                    <td key={d.id} className="px-3 py-2 text-gray-400">{f(d)?.dividendYield != null ? `${f(d)!.dividendYield!.toFixed(2)}%` : '—'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <p className="text-sm text-gray-500 text-center py-8">Selecione ao menos um ativo para comparar.</p>
      )}
    </Main>
  )
}