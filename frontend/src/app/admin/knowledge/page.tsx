'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Button, Card, EmptyState, PageHeader, Spinner, formatDate, inputCls, selectCls } from '@/components/ui'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

interface KnowledgeDoc {
  id: string
  title: string
  category: 'PLATFORM' | 'INVESTING' | 'NEWS'
  source: string | null
  status: string
  chunkCount: number
  createdAt: string
}

interface RagStatus {
  enabled: boolean
  provider: string
}

const CATEGORIES: KnowledgeDoc['category'][] = ['PLATFORM', 'INVESTING', 'NEWS']

export default function AdminKnowledgePage() {
  const { t } = useI18n()
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [rag, setRag] = useState<RagStatus | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<KnowledgeDoc['category']>('PLATFORM')
  const [source, setSource] = useState('')

  const [query, setQuery] = useState('')
  const [sources, setSources] = useState<any[]>([])
  const [searched, setSearched] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ragRes, docsRes] = await Promise.all([
        api.get<{ rag: RagStatus }>('/ai/rag/status'),
        api.get<{ documents: KnowledgeDoc[] }>('/ai/rag/docs'),
      ])
      setRag(ragRes.rag)
      setDocs(docsRes.documents)
      setMessage('')
    } catch (err: any) {
      setMessage(err.message || 'Erro ao carregar base de conhecimento')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await api.post('/ai/rag/docs', { title, content, category, source: source || undefined })
      setMessage(t('knowledge.create.created').replace('{{n}}', '1'))
      setTitle('')
      setContent('')
      setSource('')
      load()
    } catch (err: any) {
      setMessage(err.message || 'Erro ao indexar documento')
    } finally {
      setBusy(false)
    }
  }

  async function handleIndexNews() {
    setBusy(true)
    setMessage('')
    try {
      const d = await api.post<{ indexed: number; skipped: number }>('/ai/rag/news/index')
      setMessage(t('knowledge.indexNews.done').replace('{{n}}', String(d.indexed)).replace('{{s}}', String(d.skipped)))
      load()
    } catch (err: any) {
      setMessage(err.message || 'Erro ao indexar notícias')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('knowledge.delete.confirm'))) return
    try {
      await api.del(`/ai/rag/docs/${id}`)
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } catch (err: any) {
      setMessage(err.message || 'Erro ao excluir')
    }
  }

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSearched(false)
    try {
      const d = await api.post<{ sources: any[] }>('/ai/rag/search', { query })
      setSources(d.sources)
      setSearched(true)
    } catch (err: any) {
      setMessage(err.message || 'Erro na busca')
    }
  }

  return (
    <Main>
      <PageHeader
        title={t('knowledge.title')}
        subtitle={t('knowledge.subtitle')}
        actions={
          <Button onClick={handleIndexNews} disabled={busy} variant="ghost">
            {t('knowledge.indexNews')}
          </Button>
        }
      />

      {message && <p className="text-xs text-market-accent mb-3">{message}</p>}

      {loading ? (
        <Spinner />
      ) : (
        <>
          {rag && (
            <Card className="mb-4" title={t('knowledge.status.title')}>
              <div className="flex flex-wrap gap-6 text-sm">
                <span className="text-gray-400">
                  {t('knowledge.provider')}: <span className="text-gray-200">{rag.provider}</span>
                </span>
                <span className={rag.enabled ? 'text-market-up' : 'text-amber-400'}>
                  {rag.enabled ? t('knowledge.status.enabled') : t('knowledge.status.keyword')}
                </span>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <Card title={t('knowledge.create.title')}>
              <form onSubmit={handleCreate} className="space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('knowledge.create.titleLabel')}
                  required
                  className={inputCls}
                />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('knowledge.create.contentLabel')}
                  required
                  rows={5}
                  className={inputCls}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select value={category} onChange={(e) => setCategory(e.target.value as any)} className={selectCls}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{t(`knowledge.category.${c}` as any)}</option>
                    ))}
                  </select>
                  <input
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder={t('knowledge.create.sourceLabel')}
                    className={inputCls}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={busy}>
                    {t('knowledge.create.submit')}
                  </Button>
                </div>
              </form>
            </Card>

            <Card title={t('knowledge.search.title')}>
              <form onSubmit={handleSearch} className="space-y-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('knowledge.search.placeholder')}
                  className={inputCls}
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm">{t('knowledge.search.submit')}</Button>
                </div>
              </form>
              {searched && (
                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                    {t('knowledge.search.sources')}
                  </p>
                  {sources.length === 0 ? (
                    <p className="text-sm text-gray-500">{t('knowledge.search.empty')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {sources.map((s, i) => (
                        <li key={i} className="text-xs text-gray-300 bg-market-bg/40 rounded-lg p-2.5">
                          <p className="font-medium text-gray-200">{s.title}</p>
                          <p className="text-gray-500 mt-0.5 line-clamp-2">{s.content}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          </div>

          <Card title={t('knowledge.docs.title')}>
            {docs.length === 0 ? (
              <EmptyState title={t('knowledge.empty')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-market-border">
                      <th className="pb-2 pr-4">{t('knowledge.create.titleLabel')}</th>
                      <th className="pb-2 pr-4">{t('knowledge.category')}</th>
                      <th className="pb-2 pr-4">{t('knowledge.source')}</th>
                      <th className="pb-2 pr-4">{t('knowledge.chunks')}</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">{t('knowledge.created')}</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-market-border/60">
                    {docs.map((d) => (
                      <tr key={d.id} className="hover:bg-market-bg/40">
                        <td className="py-2.5 pr-4 text-gray-200 font-medium">{d.title}</td>
                        <td className="py-2.5 pr-4">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-market-accent/15 text-market-accent">
                            {t(`knowledge.category.${d.category}` as any)}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-500">{d.source || '—'}</td>
                        <td className="py-2.5 pr-4 text-gray-400">{d.chunkCount}</td>
                        <td className="py-2.5 pr-4 text-gray-400">{d.status}</td>
                        <td className="py-2.5 pr-4 text-gray-500">{formatDate(d.createdAt)}</td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)}>
                            {t('knowledge.delete')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </Main>
  )
}