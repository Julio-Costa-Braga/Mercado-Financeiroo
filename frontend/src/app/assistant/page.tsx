'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Button, Card, PageHeader, Spinner, StatusBadge, inputCls, selectCls } from '@/components/ui'
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

interface TipsResponse {
  tips: {
    id: string
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
            {l}
          </p>
        ))}
      </div>
    </Card>
  )
}

export default function AssistantPage() {
  const [tab, setTab] = useState<'briefing' | 'tips'>('briefing')
  const [scope, setScope] = useState('platform')
  const [id, setId] = useState('')
  const [bing, setBing] = useState<BriefingResponse | null>(null)
  const [tips, setTips] = useState<TipsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadBriefing = useCallback(async (scopeVal: string, idVal: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ scope: scopeVal })
      if (idVal) params.set('id', idVal)
      const data = await api.get<BriefingResponse>(`/ai/briefing?${params.toString()}`)
      setBing(data)
      setTips(null)
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar briefing')
      setBing(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTips = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get<TipsResponse>('/ai/tips')
      setTips(data)
      setBing(null)
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar dicas')
      setTips(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBriefing('platform', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleGenerate() {
    if (tab === 'tips') {
      loadTips()
    } else {
      loadBriefing(scope, id.trim())
    }
  }

  const ai = tab === 'tips' ? tips?.tips : bing?.briefing

  return (
    <Main>
      <PageHeader
        title="Assistente IA"
        subtitle="Briefings executivos, dicas de investimento e inteligencias da plataforma"
        actions={
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? 'Gerando...' : tab === 'tips' ? 'Gerar dicas' : 'Gerar briefing'}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {(['briefing', 'tips'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              tab === t
                ? 'bg-market-accent/15 text-market-accent border-market-accent/40'
                : 'bg-market-card/50 text-gray-400 border-market-border hover:text-gray-200'
            }`}
          >
            {t === 'briefing' ? 'Briefings' : 'Dicas de investimento'}
          </button>
        ))}
      </div>

      {tab === 'briefing' && (
        <div className="flex flex-wrap gap-3 items-end mb-6">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Escopo</label>
            <select value={scope} onChange={(e) => setScope(e.target.value)} className={`${selectCls} min-w-48`}>
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
                className={`${inputCls} min-w-64`}
              />
            </div>
          )}
        </div>
      )}

      {tab === 'tips' && (
        <Card className="mb-6">
          <p className="text-sm text-gray-400">
            Dicas geradas a partir dos dados da plataforma: momentum do dia, fundamentos, dividendos, setores e eventos econômicos previstos. Não constituem recomendação formal de investimento.
          </p>
        </Card>
      )}

      {error && <p className="text-sm text-market-down mb-4">{error}</p>}

      {loading ? (
        <Spinner />
      ) : ai ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <StatusBadge status={ai.ai ? 'DONE' : 'ACTIVE'} />
            <span className="text-xs text-gray-500">
              {ai.ai ? 'Gerado por IA (OpenAI)' : 'Modo template (sem OPENAI_API_KEY)'} ·{' '}
              {new Date(ai.generatedAt).toLocaleTimeString('pt-PT')}
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ai.sections.map((s, i) => renderSection(s, i))}
          </div>
        </div>
      ) : null}
    </Main>
  )
}