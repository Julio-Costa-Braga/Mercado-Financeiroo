'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, Spinner, StatusBadge, formatDate } from '@/components/ui'
import { api } from '@/lib/api'

interface Task {
  id: string
  title: string
  type: string
  priority: string
  status: string
  dueAt: string | null
  result: string | null
  notes: string | null
  client: { id: string; name: string } | null
  owner: { id: string; name: string } | null
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({ title: '', type: 'FOLLOW_UP', priority: 'MEDIUM', clientId: '', dueAt: '' })
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (statusFilter) params.set('status', statusFilter)
      const data = await api.get<{ tasks: Task[] }>(`/tasks?${params.toString()}`)
      setTasks(data.tasks)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  async function searchClients(q: string) {
    setClientSearch(q)
    if (!q.trim()) { setClientResults([]); return }
    const data = await api.get<{ clients: any[] }>(`/clients?search=${encodeURIComponent(q)}&limit=6`)
    setClientResults(data.clients)
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/tasks', {
      title: form.title,
      type: form.type,
      priority: form.priority,
      clientId: form.clientId || undefined,
      dueAt: form.dueAt || undefined,
    })
    setForm({ title: '', type: 'FOLLOW_UP', priority: 'MEDIUM', clientId: '', dueAt: '' })
    setClientSearch('')
    setClientResults([])
    load()
  }

  async function updateStatus(id: string, status: string) {
    await api.put(`/tasks/${id}`, { status })
    load()
  }

  const priorityStyle: Record<string, string> = {
    HIGH: 'text-market-down',
    MEDIUM: 'text-amber-400',
    LOW: 'text-gray-400',
  }

  return (
    <Main>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Follow-up / Tarefas</h1>
          <p className="text-sm text-gray-500">Gerenciamento de tarefas</p>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-market-card border border-market-border rounded-md px-3 py-2 text-sm text-gray-300">
          <option value="">Todos os status</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card title="Nova tarefa" className="h-fit">
          <form onSubmit={createTask} className="space-y-3">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título" className="w-full bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm" />
            <select className="w-full bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="CALL">Call</option>
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="REACTIVATION">Reactivation</option>
              <option value="RESEARCH">Research</option>
              <option value="REVIEW">Review</option>
              <option value="COMPLIANCE">Compliance</option>
            </select>
            <select className="w-full bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Média</option>
              <option value="LOW">Baixa</option>
            </select>
            <div>
              <input value={clientSearch} onChange={(e) => searchClients(e.target.value)} placeholder="Buscar cliente..." className="w-full bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm" />
              {clientResults.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {clientResults.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setForm({ ...form, clientId: c.id }); setClientSearch(c.name); setClientResults([]) }} className="w-full text-left px-3 py-1.5 rounded text-sm bg-market-bg hover:bg-market-border text-gray-300">
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} className="w-full bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm" />
            <button className="w-full bg-market-accent text-white text-sm py-2 rounded-md hover:opacity-90">Criar tarefa</button>
          </form>
        </Card>

        <div className="lg:col-span-3">
          <Card title={`Tarefas (${tasks.length})`}>
            {loading ? (
              <Spinner />
            ) : (
              <div className="space-y-2">
                {tasks.map((t) => (
                  <div key={t.id} className="bg-market-bg border border-market-border rounded-md p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-200">{t.title}</p>
                          <span className={`text-xs font-medium ${priorityStyle[t.priority] || 'text-gray-400'}`}>{t.priority}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{t.type}</span>
                          {t.client && <span>Cliente: {t.client.name}</span>}
                          <span>Owner: {t.owner?.name || '—'}</span>
                          {t.dueAt && <span>Vence: {formatDate(t.dueAt)}</span>}
                        </div>
                        {t.notes && <p className="text-xs text-gray-500 mt-1">{t.notes}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge status={t.status} />
                        <div className="flex gap-2">
                          {t.status === 'OPEN' && (
                            <button onClick={() => updateStatus(t.id, 'IN_PROGRESS')} className="text-xs text-amber-400 hover:underline">Começar</button>
                          )}
                          {t.status !== 'DONE' && t.status !== 'CANCELLED' && (
                            <button onClick={() => updateStatus(t.id, 'DONE')} className="text-xs text-market-up hover:underline">Concluir</button>
                          )}
                          {t.status !== 'CANCELLED' && t.status !== 'DONE' && (
                            <button onClick={() => updateStatus(t.id, 'CANCELLED')} className="text-xs text-gray-500 hover:underline">Cancelar</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && <p className="text-sm text-gray-500 text-center py-6">Nenhuma tarefa encontrada.</p>}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Main>
  )
}