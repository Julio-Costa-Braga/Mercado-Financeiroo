'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, Spinner, StatusBadge } from '@/components/ui'
import { api } from '@/lib/api'

interface BriefingResponse {
  briefing: {
    id: string
    scope: string
    generatedAt: string
    ai: boolean
    sections: string[]
  }
  data?: any
}

const SCOPES = [
  { value: 'platform', label: 'Plataforma' },
  { value: 'news', label: 'Notícias' },
  { value: 'asset', label: 'Ativo (ticker)' },
  { value: 'sector', label: 'Setor' },
  { value: 'client', label: 'Cliente (id)' },
]

function renderSection(text: string, idx: number) {
  const lines = text.split('\n')
  const title = lines[0].replace(/^##\s+/, '')
  const body = lines.slice(1).filter((l) => l.trim())
  return (
    <Card key={idx} title={title}>
      <div className="space-y-1.5">
        {body.map((l, j) => (
          <p key={j} className="text-sm text-gray-400 whitespace-pre-wrap">
            {l.startsWith('-') ? l : l}
          </p>
        ))}
      </div>
    </Card>
  )
}

export default function AssistantPage() {
  const [scope, setScope] = useState('platform')
  const [id, setId] = useState('')
  const [bing, setBing] = useState<BriefingResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (scopeVal: string, idVal: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ scope: scopeVal })
      if (idVal) params.set('id', idVal)
      const data = await api.get<BriefingResponse>(`/ai/briefing?${params.toString()}`)
      setBing(data)
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar briefing')
      setBing(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load('platform', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleGenerate() {
    load(scope, id.trim())
  }

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white">Assistente IA</h1>
        <p className="text-sm text-gray-500">Briefings executivos gerados dos dados da plataforma</p>
      </header>

      <div className="flex flex-wrap gap-3 items-end mb-6">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Escopo</label>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="bg-market-card border border-market-border rounded-md px-3 py-2 text-sm text-gray-300">
            {SCOPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {(scope === 'asset' || scope === 'sector' || scope === 'client') && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">{scope === 'asset' ? 'Ticker (ex: NVDA)' : scope === 'sector' ? 'Setor (ex: Technology)' : 'Id do cliente'}</label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder={scope === 'asset' ? 'NVDA' : scope === 'sector' ? 'Technology' : 'client-...'}
              className="bg-market-card border border-market-border rounded-md px-3 py-2 text-sm text-gray-200 w-64"
            />
          </div>
        )}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-market-accent text-black text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
        >
          {loading ? 'Gerando...' : 'Gerar briefing'}
        </button>
      </div>

      {error && <p className="text-sm text-market-down mb-4">{error}</p>}

      {loading ? (
        <Spinner />
      ) : bing ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <StatusBadge status={bing.briefing.ai ? 'DONE' : 'ACTIVE'} />
            <span className="text-xs text-gray-500">
              {bing.briefing.ai ? 'Gerado por IA' : 'Modo template (sem OPENAI_API_KEY)'} ·{' '}
              {new Date(bing.briefing.generatedAt).toLocaleTimeString('pt-PT')}
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {bing.briefing.sections.map((s, i) => renderSection(s, i))}
          </div>
        </div>
      ) : null}
    </Main>
  )
}