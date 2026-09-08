'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Main } from '@/components/layout'
import { Card, Spinner, StatusBadge, formatDate } from '@/components/ui'
import { api } from '@/lib/api'

interface Client360 {
  client: any
  financial: any[]
}

export default function Client360Page() {
  const { id } = useParams()
  const [data, setData] = useState<Client360 | null>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [contactNotes, setContactNotes] = useState('')
  const [interest, setInterest] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<Client360>(`/clients/${id}`)
      setData(data)
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

  if (loading) return <Main><Spinner /></Main>
  if (!data) return <Main><p className="text-market-down">Cliente não encontrado</p></Main>

  const c = data.client

  return (
    <Main>
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">{c.name}</h1>
          <StatusBadge status={c.status} />
          {c.priorityScore > 0 && (
            <span className={`text-xs font-medium px-2 py-1 rounded ${c.priorityScore >= 70 ? 'bg-market-down/10 text-market-down' : c.priorityScore >= 40 ? 'bg-amber-500/10 text-amber-400' : 'bg-market-up/10 text-market-up'}`}>
              Priority: {c.priorityScore}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {c.country || '—'} · Owner: {c.owner?.name || '—'} · Churn Risk: {c.churnRisk}
        </p>
      </header>

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
            <input value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="Novo interesse" className="flex-1 bg-market-bg border border-market-border rounded-md px-3 py-1.5 text-sm" />
            <button className="bg-market-accent text-white text-xs px-3 py-1.5 rounded-md">+</button>
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
                <p className="text-gray-300">{n.content}</p>
                <p className="text-xs text-gray-600 mt-1">{n.author?.name || '—'} · {formatDate(n.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Ações rápidas */}
        <Card title="Ações rápidas">
          <form onSubmit={addContact} className="space-y-2 mb-4">
            <textarea value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} placeholder="Notas do contato..." className="w-full bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm resize-none" rows={3} />
            <button className="w-full bg-market-up/20 text-market-up text-sm py-2 rounded-md hover:bg-market-up/30">Registrar contato</button>
          </form>
          <form onSubmit={addNote} className="space-y-2">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Adicionar nota..." className="w-full bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm resize-none" rows={3} />
            <button className="w-full bg-market-bg border border-market-border text-gray-300 text-sm py-2 rounded-md hover:bg-market-border">Adicionar nota</button>
          </form>
        </Card>
      </div>
    </Main>
  )
}