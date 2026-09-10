'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Main } from '@/components/layout'
import { Button, Card, EmptyState, PageHeader, Spinner, StatusBadge, formatDate, inputCls } from '@/components/ui'
import { api } from '@/lib/api'

interface Client360 {
  client: any
  financial: any[]
}

interface OnboardingQuestion {
  id: string
  title: string
  hint: string
  options: Array<{ value: number; label: string; hint?: string }>
}

const RISK_LABELS: Record<string, string> = {
  CONSERVATIVE: 'Conservador',
  MODERATE: 'Moderado',
  AGGRESSIVE: 'Arrojado',
}

const TYPE_LABELS: Record<string, string> = {
  BEGINNER: 'Iniciante',
  ENTHUSIAST: 'Entusiasta',
  INTERMEDIATE: 'Intermediario',
  ADVANCED: 'Avancado',
  PROFESSIONAL: 'Profissional / Gestor',
}

export default function Client360Page() {
  const { id } = useParams()
  const [data, setData] = useState<Client360 | null>(null)
  const [loading, setLoading] = useState(true)

  const [note, setNote] = useState('')
  const [contactNotes, setContactNotes] = useState('')
  const [interest, setInterest] = useState('')

  // onboarding
  const [onbOpen, setOnbOpen] = useState(false)
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [onbSaving, setOnbSaving] = useState(false)
  const [onbError, setOnbError] = useState('')
  const [profileExplained, setProfileExplained] = useState('')

  // esboco IA
  const [sketch, setSketch] = useState('')
  const [sketchLoading, setSketchLoading] = useState(false)

  // documentos
  const [uploading, setUploading] = useState(false)
  const [docMsg, setDocMsg] = useState('')
  const [docError, setDocError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<Client360>(`/clients/${id}`)
      setData(data)
      const sketchNote = (data.client.notes || []).find((n: any) => n.content?.startsWith('[IA]'))
      if (sketchNote) setSketch(sketchNote.content.replace(/^\[IA\] Esboco do cliente\n\n/, ''))
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    await api.post(`/clients/${id}/notes`, { content: note })
    setNote('')
    load()
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    await api.post(`/clients/${id}/contacts`, { type: 'call', notes: contactNotes, via: 'manual' })
    setContactNotes('')
    load()
  }

  async function addInterest(e: React.FormEvent) {
    e.preventDefault()
    if (!interest.trim()) return
    await api.post(`/clients/${id}/interests`, { interest })
    setInterest('')
    load()
  }

  async function openOnboarding() {
    if (questions.length > 0) {
      setOnbOpen(true)
      return
    }
    try {
      const res = await api.get<{ questions: OnboardingQuestion[] }>('/ai/questions')
      setQuestions(res.questions)
      setOnbOpen(true)
    } catch (err: any) {
      setOnbError(err.message || 'Erro ao carregar questionario')
    }
  }

  async function submitOnboarding() {
    const all = Object.keys(answers)
    if (all.length !== questions.length) {
      setOnbError('Responda todas as perguntas antes de salvar.')
      return
    }
    setOnbSaving(true)
    setOnbError('')
    try {
      const res = await api.post<{ profile: { explanation: string } }>('/ai/onboarding', {
        clientId: id,
        answers: questions.map((q) => ({ questionId: q.id, value: answers[q.id] })),
      })
      setProfileExplained(res.profile.explanation)
      setOnbOpen(false)
      setSketch('')
      load()
    } catch (err: any) {
      setOnbError(err.message || 'Erro ao salvar perfil')
    } finally {
      setOnbSaving(false)
    }
  }

  async function regenSketch() {
    setSketchLoading(true)
    try {
      const res = await api.get<{ sketch: string }>(`/ai/clients/${id}/sketch`)
      setSketch(res.sketch)
      load()
    } catch (err: any) {
      console.error(err)
    } finally {
      setSketchLoading(false)
    }
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setDocMsg('')
    setDocError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.postForm(`/clients/${id}/documents`, fd)
      setDocMsg('Documento enviado com sucesso.')
      if (fileRef.current) fileRef.current.value = ''
      load()
    } catch (err: any) {
      setDocError(err.message || 'Erro ao enviar documento')
    } finally {
      setUploading(false)
    }
  }

  async function handleDocDelete(docId: string) {
    if (!window.confirm('Excluir este documento?')) return
    try {
      await api.del(`/clients/${id}/documents/${docId}`)
      load()
    } catch (err: any) {
      setDocError(err.message || 'Erro ao excluir documento')
    }
  }

  function fmtSize(bytes: number): string {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB'
    return bytes + ' B'
  }

  if (loading) return <Main><Spinner /></Main>
  if (!data) return <Main><p className="text-market-down">Cliente não encontrado</p></Main>

  const c = data.client
  const hasProfile = !!c.onboardingCompletedAt && !!c.riskProfile

  return (
    <Main>
      <PageHeader
        title={<span className="flex items-center gap-3">{c.name} <StatusBadge status={c.status} /></span>}
        subtitle={
          <span className="flex items-center gap-3">
            <span>{c.country || '—'} · Owner: {c.owner?.name || '—'} · Churn Risk: {c.churnRisk}</span>
            {hasProfile && (
              <span className="flex gap-1.5">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-market-accent/10 text-market-accent border border-market-accent/30">
                  {RISK_LABELS[c.riskProfile] || c.riskProfile}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-market-bg border border-market-border text-gray-300">
                  {TYPE_LABELS[c.clientType] || c.clientType}
                </span>
              </span>
            )}
          </span>
        }
      />

      {/* Perfil do investidor + Esboco IA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card title="Perfil do investidor" className="lg:col-span-1">
          {!hasProfile && !onbOpen ? (
            <div>
              <p className="text-sm text-gray-500 mb-4">Identifique o tipo de cliente e o perfil de risco com o questionário padrao.</p>
              <Button onClick={openOnboarding}>Responder questionario</Button>
            </div>
          ) : null}

          {onbOpen && (
            <div className="space-y-4">
              {questions.map((q) => (
                <div key={q.id}>
                  <p className="text-sm font-medium text-gray-200">{q.title}</p>
                  <p className="text-[11px] text-gray-500 mb-2">{q.hint}</p>
                  <div className="space-y-1">
                    {q.options.map((o) => (
                      <label
                        key={o.value}
                        className={`block border rounded-lg px-3 py-2 text-sm cursor-pointer transition-all ${
                          answers[q.id] === o.value
                            ? 'border-market-accent/50 bg-market-accent/10 text-gray-100'
                            : 'border-market-border text-gray-400 hover:border-market-accent/30'
                        }`}
                      >
                        <span className="flex items-start gap-2">
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={answers[q.id] === o.value}
                            onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))}
                            className="mt-1 accent-market-accent"
                          />
                          <span>
                            {o.label}
                            {o.hint && <span className="block text-[11px] text-gray-600">{o.hint}</span>}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {onbError && <p className="text-sm text-market-down">{onbError}</p>}
              <div className="flex gap-2 pt-2">
                <Button onClick={submitOnboarding} disabled={onbSaving}>
                  {onbSaving ? 'Salvando...' : 'Salvar perfil'}
                </Button>
                <Button variant="ghost" onClick={() => setOnbOpen(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {hasProfile && !onbOpen && (
            <div className="text-sm">
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="px-2.5 py-1 rounded-lg bg-market-accent/15 text-market-accent font-medium text-xs">{RISK_LABELS[c.riskProfile]}</span>
                <span className="px-2.5 py-1 rounded-lg bg-market-bg border border-market-border text-gray-300 font-medium text-xs">{TYPE_LABELS[c.clientType]}</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">Concluido em {formatDate(c.onboardingCompletedAt)}</p>
              {profileExplained && <pre className="text-[11px] text-gray-500 whitespace-pre-wrap mb-3 bg-market-bg rounded-lg p-3">{profileExplained}</pre>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setOnbOpen(true); openOnboarding(); }}>
                  Refazer questionario
                </Button>
                <Button variant="ghost" size="sm" onClick={regenSketch} disabled={sketchLoading}>
                  {sketchLoading ? 'Gerando...' : 'Regenerar esboco'}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card title="Esboco IA" className="lg:col-span-2">
          {sketch ? (
            <>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {sketch.split('\n\n').map((sec, i) => {
                  const lines = sec.split('\n')
                  const title = lines[0].replace(/^##\s+/, '')
                  const body = lines.slice(1).filter((l) => l.trim())
                  return (
                    <div key={i}>
                      <p className="text-sm font-semibold text-gray-200 mb-1">{title}</p>
                      <div className="space-y-0.5">
                        {body.map((l, j) => (
                          <p key={j} className="text-xs text-gray-400 whitespace-pre-wrap">{l}</p>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3">
                <Button variant="ghost" size="sm" onClick={regenSketch} disabled={sketchLoading}>
                  {sketchLoading ? 'Gerando...' : 'Regenerar esboco'}
                </Button>
              </div>
            </>
          ) : (
            <div>
              <EmptyState
                title="Nenhum esboco gerado ainda"
                description="A IA resume o perfil do cliente sempre que o cadastro e atualizado ou o perfil de risco e concluido."
              />
              <div className="text-center">
                <Button onClick={regenSketch} disabled={sketchLoading}>
                  {sketchLoading ? 'Gerando...' : 'Gerar esboco'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Informações */}
        <Card title="Informações">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-gray-500 text-xs">E-mail</dt><dd className="text-gray-300">{c.email || '—'}</dd></div>
            <div><dt className="text-gray-500 text-xs">Telefone</dt><dd className="text-gray-300">{c.phone || '—'}</dd></div>
            <div><dt className="text-gray-500 text-xs">Experiência</dt><dd className="text-gray-300">{c.experience || '—'}</dd></div>
            <div><dt className="text-gray-500 text-xs">Objetivo</dt><dd className="text-gray-300">{c.objective || '—'}</dd></div>
            <div><dt className="text-gray-500 text-xs">Último contato</dt><dd className="text-gray-300">{formatDate(c.lastContactAt)}</dd></div>
            <div><dt className="text-gray-500 text-xs">Último login</dt><dd className="text-gray-300">{formatDate(c.lastLoginAt)}</dd></div>
          </dl>
        </Card>

        {/* Interesses */}
        <Card title="Interesses">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {c.interests?.map((i: any) => (
              <span key={i.interest} className="text-xs bg-market-accent/10 text-market-accent border border-market-accent/30 px-2 py-1 rounded">
                {i.interest}
              </span>
            ))}
          </div>
          <form onSubmit={addInterest} className="flex gap-2">
            <input value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="Novo interesse" className={`${inputCls} py-1.5`} />
            <Button variant="primary" size="sm" type="submit">+</Button>
          </form>

          <h4 className="text-xs font-semibold text-gray-400 mt-4 mb-2">Watchlist</h4>
          <div className="flex flex-wrap gap-1.5">
            {c.watchlists?.flatMap((wl: any) => wl.assets).slice(0, 10).map((a: any) => (
              <span key={a.id} className="text-xs bg-market-bg border border-market-border px-2 py-1 rounded text-gray-300">
                {a.asset.ticker}
              </span>
            ))}
          </div>
        </Card>

        {/* Atividade */}
        <Card title="Atividade">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500 text-xs">Último login</dt><dd className="text-gray-300">{formatDate(c.lastLoginAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500 text-xs">Última interação</dt><dd className="text-gray-300">{formatDate(c.lastInteractionAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500 text-xs">Último contato</dt><dd className="text-gray-300">{formatDate(c.lastContactAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500 text-xs">Total interações</dt><dd className="text-gray-300">{c._count?.tasks ?? 0}</dd></div>
          </dl>
        </Card>

        {/* Timeline */}
        <Card title="Timeline" className="lg:col-span-2">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {c.events?.map((ev: any) => (
              <div key={ev.id} className="flex gap-3 text-sm">
                <span className="text-xs text-gray-600 w-20 shrink-0">{formatDate(ev.date)}</span>
                <div>
                  <span className="text-gray-300 font-medium">{ev.type}</span>
                  {ev.meta && Object.keys(ev.meta).length > 0 && (
                    <span className="text-gray-500 ml-2">{JSON.stringify(ev.meta)}</span>
                  )}
                </div>
              </div>
            ))}
            {c.events?.length === 0 && <p className="text-sm text-gray-500">Sem eventos registrados.</p>}
          </div>

          <h4 className="text-xs font-semibold text-gray-400 mt-4 mb-2">Notas recentes</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {c.notes?.map((n: any) => (
              <div key={n.id} className="bg-market-bg rounded-md p-2 text-sm">
                <p className="text-gray-300 whitespace-pre-wrap">{n.content}</p>
                <p className="text-xs text-gray-600 mt-1">{n.author?.name || 'IA · automática'} · {formatDate(n.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Ações rápidas */}
        <Card title="Ações rápidas">
          <form onSubmit={addContact} className="space-y-2 mb-4">
            <textarea value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} placeholder="Notas do contato..." className={`${inputCls} resize-none`} rows={3} />
            <Button variant="ghost" type="submit" className="w-full">Registrar contato</Button>
          </form>
          <form onSubmit={addNote} className="space-y-2">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Adicionar nota..." className={`${inputCls} resize-none`} rows={3} />
            <Button variant="outline" type="submit" className="w-full">Adicionar nota</Button>
          </form>
        </Card>

        {/* Documentos */}
        <Card
          title="Documentos"
          className="lg:col-span-3"
          action={
            <>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={handleDocUpload}
              />
              <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Enviando...' : 'Enviar documento'}
              </Button>
            </>
          }
        >
          {docMsg && (
            <div className="mb-4 text-xs text-market-up bg-market-up/10 border border-market-up/20 rounded-lg px-3 py-2.5">{docMsg}</div>
          )}
          {docError && (
            <div className="mb-4 text-xs text-market-down bg-market-down/10 border border-market-down/20 rounded-lg px-3 py-2.5">{docError}</div>
          )}
          {!c.documents || c.documents.length === 0 ? (
            <EmptyState title="Nenhum documento" description="Envie contratos, propostas, comprovantes ou documentos de identificação do cliente." />
          ) : (
            <ul className="divide-y divide-market-border/60">
              {c.documents.map((d: any) => (
                <li key={d.id} className="flex items-center gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{d.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {d.category} · {fmtSize(d.size)} · {d.uploadedBy?.name || '—'} · {formatDate(d.createdAt)}
                    </p>
                  </div>
                  <a
                    href={`${api.getBaseUrl()}/clients/${id}/documents/${d.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-market-accent hover:underline shrink-0"
                  >
                    Baixar
                  </a>
                  <button onClick={() => handleDocDelete(d.id)} className="text-xs text-market-down hover:underline shrink-0">
                    Excluir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Main>
  )
}