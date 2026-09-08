'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, ChangeBadge, Spinner, formatPrice } from '@/components/ui'
import { api } from '@/lib/api'

interface WatchlistAsset {
  id: string
  asset: {
    id: string
    ticker: string
    name: string
    type: string
    quotes: Array<{ price: number; changePct1D: number | null }>
  }
  groupName: string | null
}

interface Watchlist {
  id: string
  name: string
  isGlobal: boolean
  assets: WatchlistAsset[]
}

export default function WatchlistPage() {
  const [lists, setLists] = useState<Watchlist[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [assetSearch, setAssetSearch] = useState('')
  const [assetResults, setAssetResults] = useState<any[]>([])
  const [activeList, setActiveList] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ watchlists: Watchlist[] }>('/watchlists')
      setLists(data.watchlists)
      if (!activeList && data.watchlists.length > 0) setActiveList(data.watchlists[0].id)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [activeList])

  useEffect(() => {
    load()
  }, [])

  async function createList(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const data = await api.post<{ watchlist: Watchlist }>('/watchlists', { name: newName })
    await load()
    setNewName('')
    setActiveList(data.watchlist.id)
  }

  async function searchAssets(q: string) {
    setAssetSearch(q)
    if (!q.trim()) { setAssetResults([]); return }
    const data = await api.get<{ assets: any[] }>(`/market?search=${encodeURIComponent(q)}&limit=10`)
    setAssetResults(data.assets)
  }

  async function addToWatchlist(assetId: string) {
    if (!activeList) return
    await api.post(`/watchlists/${activeList}/assets`, { assetId })
    setAssetResults([])
    setAssetSearch('')
    load()
  }

  async function removeFromWatchlist(assetId: string) {
    if (!activeList) return
    await api.del(`/watchlists/${activeList}/assets/${assetId}`)
    load()
  }

  const active = lists.find((l) => l.id === activeList)

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white">Watchlist</h1>
        <p className="text-sm text-gray-500">Monitoramento de ativos</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Listas */}
        <Card title="Minhas listas" className="h-fit">
          <div className="space-y-1 mb-4">
            {lists.map((l) => (
              <button
                key={l.id}
                onClick={() => setActiveList(l.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  activeList === l.id ? 'bg-market-accent/20 text-market-accent' : 'text-gray-400 hover:bg-market-border'
                }`}
              >
                {l.name} <span className="text-xs opacity-60">({l.assets.length})</span>
              </button>
            ))}
          </div>
          <form onSubmit={createList} className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nova lista" className="flex-1 bg-market-bg border border-market-border rounded-md px-2 py-1.5 text-sm" />
            <button className="bg-market-accent text-white text-xs px-2 py-1.5 rounded-md">+</button>
          </form>
        </Card>

        {/* Ativos */}
        <div className="lg:col-span-3 space-y-4">
          <Card title={active?.name || 'Watchlist'}>
            {loading ? (
              <Spinner />
            ) : active ? (
              <div className="space-y-2">
                {active.assets.map((a) => (
                  <div key={a.id} className="flex items-center justify-between bg-market-bg border border-market-border rounded-md p-3">
                    <div>
                      <p className="font-semibold text-gray-200">{a.asset.ticker}</p>
                      <p className="text-xs text-gray-500">{a.asset.name} · {a.asset.type}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{formatPrice(a.asset.quotes[0]?.price)}</span>
                      <ChangeBadge value={a.asset.quotes[0]?.changePct1D} />
                      <button onClick={() => removeFromWatchlist(a.asset.id)} className="text-market-down text-xs">remover</button>
                    </div>
                  </div>
                ))}
                {active.assets.length === 0 && <p className="text-sm text-gray-500 py-4 text-center">Watchlist vazia.</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Crie uma lista primeiro.</p>
            )}
          </Card>

          <Card title="Adicionar ativo">
            <input
              value={assetSearch}
              onChange={(e) => searchAssets(e.target.value)}
              placeholder="Buscar ativo (ex: BTC, NVDA, EURUSD)..."
              className="w-full bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm"
            />
            {assetResults.length > 0 && (
              <div className="mt-2 space-y-1">
                {assetResults.map((a) => (
                  <button key={a.id} onClick={() => addToWatchlist(a.id)} className="w-full flex items-center justify-between px-3 py-2 rounded bg-market-border hover:opacity-80 text-left">
                    <span>
                      <span className="font-medium text-gray-200">{a.ticker}</span>
                      <span className="text-xs text-gray-500 ml-2">{a.name}</span>
                    </span>
                    <span className="text-xs text-market-accent">+ adicionar</span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Main>
  )
}