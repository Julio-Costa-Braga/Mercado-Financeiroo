'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, Spinner, formatDate } from '@/components/ui'
import { api } from '@/lib/api'

interface NewsArticle {
  id: string
  title: string
  source: string
  url: string | null
  excerpt: string | null
  publishedAt: string
  sentiment: number | null
  impact: string | null
  sector: string | null
  assetLinks: Array<{ asset: { ticker: string; name: string } }>
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [impact, setImpact] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (impact) params.set('impact', impact)
      if (search) params.set('search', search)
      const data = await api.get<{ news: NewsArticle[] }>(`/news?${params.toString()}`)
      setNews(data.news)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [impact, search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white">Notícias</h1>
        <p className="text-sm text-gray-500">Feed de mercado</p>
      </header>

      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar notícias..."
          className="flex-1 bg-market-card border border-market-border rounded-md px-3 py-2 text-sm text-gray-200"
        />
        <select value={impact} onChange={(e) => setImpact(e.target.value)} className="bg-market-card border border-market-border rounded-md px-3 py-2 text-sm text-gray-300">
          <option value="">Impacto</option>
          <option value="HIGH">Alto</option>
          <option value="MEDIUM">Médio</option>
          <option value="LOW">Baixo</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-3">
          {news.map((n) => (
            <Card key={n.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-200">{n.title}</h3>
                  {n.excerpt && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.excerpt}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-500">{n.source}</span>
                    <span className="text-xs text-gray-600">{formatDate(n.publishedAt)}</span>
                    {n.impact && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        n.impact === 'HIGH' ? 'bg-red-500/10 text-red-400' :
                        n.impact === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {n.impact}
                      </span>
                    )}
                    {n.sentiment !== null && n.sentiment !== undefined && (
                      <span className={`text-xs ${n.sentiment >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                        Sentimento: {n.sentiment >= 0 ? '+' : ''}{n.sentiment.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                {n.assetLinks.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-end max-w-40">
                    {n.assetLinks.map((l) => (
                      <span key={l.asset.ticker} className="text-xs bg-market-bg border border-market-border px-2 py-0.5 rounded text-gray-300">
                        {l.asset.ticker}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
          {news.length === 0 && <p className="text-sm text-gray-500 text-center py-8">Nenhuma notícia encontrada.</p>}
        </div>
      )}
    </Main>
  )
}