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

type Tab = 'briefing' | 'tips'

const SCOPES = [
  { value: 'platform', label: 'Plataforma' },
  { value: 'news', label: 'Notícias' },
  { value: 'asset', label: 'Ativo (ticker)' },
  { value: 'sector', label: 'Setor' },
  { value: 'client', label: 'Cliente (id)' },
]

type Result = { generatedAt: string; ai: boolean; sections: string[] }

function SectionList({ sections }: { sections: string[] }) {
  return (
    <div className="space-y-5">
      {sections.map((text, i) => {
        const lines = text.split('\n').filter((l) => l.trim())
        const title = lines[0]?.replace(/^#+\s+/, '').trim() || `Seção ${i + 1}`
        const body = lines.slice(1)
        return (
          <Card key={i} className="!p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-market-border bg-market-bg/40 flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-market-accent/15 text-market-accent text-xs font-bold shrink-0">
                {i + 1}
              </span>
              <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {body.map((l, j) => (
                <p key={j} className="text-[13px] text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {l.replace(/^[-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
                </p>
              ))}
              {body.length === 0 && <p className="text-[13px] text-gray-500">—</p>}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export default function AssistantPage() {
  const [tab, setTab] = useState<Tab>('briefing')
  const [scope, setScope] = useState('platform')
  const [id, setId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [meta, setMeta] = useState<{ scope?: string }>({})

  const loadBriefing = useCallback(async (scopeVal: string, idVal: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ scope: scopeVal })
      if (idVal) params.set('id', idVal)
      const data = await api.get<BriefingResponse>(`/ai/briefing?${params.toString()}`)
      setResult(data.briefing)
      setMeta({ scope: scopeVal + (idVal ? `:${idVal}` : '') })
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar briefing')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTips = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get<TipsResponse>('/ai/tips')
      setResult(data.tips)
      setMeta({ scope: 'tips' })
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar dicas')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBriefing('platform', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const needsId = scope === 'asset' || scope === 'sector' || scope === 'client'

  return (
    <Main>
      <PageHeader
        title="Assistente IA"
        subtitle="Briefings executivos e dicas de investimento com dados reais da plataforma"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Painel de controles */}
        <Card className="lg:sticky lg:top-20">
          <div className="flex rounded-xl bg-market-bg border border-market-border p-1 mb-5">
            {(['briefing', 'tips'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t)
                  setError('')
                }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t ? 'bg-market-accent/15 text-market-accent border border-market-accent/40' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t === 'briefing' ? 'Briefings' : 'Dicas'}
              </button>
            ))}
          </div>

          {tab === 'briefing' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Escopo</label>
                <select value={scope} onChange={(e) => setScope(e.target.value)} className={`${selectCls} w-full`}>
                  {SCOPES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              {needsId && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">
                    {scope === 'asset' ? 'Ticker (ex: NVDA)' : scope === 'sector' ? 'Setor (ex: Technology)' : 'Id do cliente'}
                  </label>
                  <input
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder={scope === 'asset' ? 'NVDA' : scope === 'sector' ? 'Technology' : 'client-...'}
                    className={`${inputCls} w-full`}
                  />
                </div>
              )}
              <Button onClick={() => loadBriefing(scope, id.trim())} disabled={loading} className="w-full justify-center">
                {loading ? 'Gerando...' : 'Gerar briefing'}
              </Button>
              {meta.scope && result && (
                <p className="text-[11px] text-gray-600">
                  Último briefing: <span className="text-gray-400">{meta.scope}</span> ·{' '}
                  {new Date(result.generatedAt).toLocaleTimeString('pt-PT')}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[13px] text-gray-400 leading-relaxed">
                  Dicas geradas a partir dos dados da plataforma: momentum do dia, fundamentos, dividendos, setores e eventos econômicos previstos.
                </p>
                <p className="text-[11px] text-gray-600">Não constituem recomendação formal de investimento.</p>
              </div>
              <Button onClick={loadTips} disabled={loading} className="w-full justify-center">
                {loading ? 'Gerando...' : 'Gerar dicas'}
              </Button>
              {meta.scope === 'tips' && result && (
                <p className="text-[11px] text-gray-600">
                  Última geração: {new Date(result.generatedAt).toLocaleTimeString('pt-PT')}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-market-down/10 border border-market-down/30 text-sm text-market-down">{error}</div>
          )}

          <div className="mt-5 pt-4 border-t border-market-border text-[11px] text-gray-500 leading-relaxed">
            Tem dúvidas? Use o <span className="text-gray-300">chat de IA</span> no botão flutuante do canto inferior direito da tela.
          </div>
        </Card>

        {/* Painel de resultados */}
        <div className="min-w-0">
          {loading && (
            <Card>
              <div className="flex items-center gap-3">
                <Spinner />
                <p className="text-sm text-gray-400">
                  {tab === 'briefing' ? 'Gerando briefing' : 'Gerando dicas'}... Isso leva alguns segundos.
                </p>
              </div>
            </Card>
          )}

          {!loading && !result && (
            <Card>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-market-accent/10 border border-market-accent/20 mb-3">
                  <svg className="w-6 h-6 text-market-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l4-4 4 4 5-6 5 5M3 20h18" />
                  </svg>
                </span>
                <p className="text-sm text-gray-400 font-medium mb-1">Nenhum resultado ainda</p>
                <p className="text-xs text-gray-600 max-w-sm">
                  Escolha um escopo no painel ao lado e clique em "Gerar briefing" ou gere as dicas de investimento do dia.
                </p>
              </div>
            </Card>
          )}

          {!loading && result && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <StatusBadge status={result.ai ? 'DONE' : 'ACTIVE'} />
                <span className="text-xs text-gray-500">
                  {result.ai ? 'Gerado por IA' : 'Modo template (sem chave de IA)'} ·{' '}
                  {new Date(result.generatedAt).toLocaleTimeString('pt-PT')}
                </span>
              </div>
              <SectionList sections={result.sections} />
            </div>
          )}
        </div>
      </div>
    </Main>
  )
}