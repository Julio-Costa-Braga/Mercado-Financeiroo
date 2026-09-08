'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { Card, Spinner, StatusBadge, formatDate } from '@/components/ui'
import { api } from '@/lib/api'

interface Client {
  id: string
  name: string
  country: string | null
  status: string
  churnRisk: number
  priorityScore: number
  lastContactAt: string | null
  owner: { name: string } | null
  interests: Array<{ interest: string }>
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [churnMin, setChurnMin] = useState('')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', email: '', country: '', interests: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (status) params.set('status', status)
      if (churnMin) params.set('churnRisk', churnMin)
      if (search) params.set('search', search)
      const data = await api.get<{ clients: Client[]; total: number }>(`/clients?${params.toString()}`)
      setClients(data.clients)
      setTotal(data.total)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [status, churnMin, search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/clients', {
        name: newClient.name,
        email: newClient.email,
        country: newClient.country,
        interests: newClient.interests.split(',').map((i) => i.trim()).filter(Boolean),
      })
      setShowCreate(false)
      setNewClient({ name: '', email: '', country: '', interests: '' })
      load()
    } catch (err: any) {
      console.error(err)
    }
  }

  return (
    <Main>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="text-sm text-gray-500">{total} clientes</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="bg-market-accent text-white text-sm px-3 py-2 rounded-md hover:opacity-90">
          {showCreate ? 'Cancelar' : '+ Novo cliente'}
        </button>
      </header>

      {showCreate && (
        <Card className="mb-4">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input required value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="Nome" className="bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm" />
            <input value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} placeholder="E-mail" className="bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm" />
            <input value={newClient.country} onChange={(e) => setNewClient({ ...newClient, country: e.target.value })} placeholder="País" className="bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <input value={newClient.interests} onChange={(e) => setNewClient({ ...newClient, interests: e.target.value })} placeholder="Interesses (separar por vírgula)" className="flex-1 bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm" />
              <button type="submit" className="bg-market-accent text-white text-sm px-3 py-2 rounded-md">Criar</button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar cliente..." className="flex-1 min-w-40 bg-market-card border border-market-border rounded-md px-3 py-2 text-sm text-gray-200" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-market-card border border-market-border rounded-md px-3 py-2 text-sm text-gray-300">
          <option value="">Status</option>
          <option value="ACTIVE">Ativo</option>
          <option value="INACTIVE">Inativo</option>
          <option value="AT_RISK">Em risco</option>
        </select>
        <input value={churnMin} onChange={(e) => setChurnMin(e.target.value)} type="number" placeholder="Churn risk mín." className="bg-market-card border border-market-border rounded-md px-3 py-2 text-sm text-gray-200 w-32" />
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-market-border text-left">
                  <th className="px-3 py-2 text-xs font-medium text-gray-400">Nome</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-400">País</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-400">Status</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-400">Owner</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-400">Último contato</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-400">Churn</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-400">Interesses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-market-border">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-market-bg">
                    <td className="px-3 py-2">
                      <Link href={`/clients/${c.id}`} className="font-medium text-gray-200 hover:text-market-accent">{c.name}</Link>
                    </td>
                    <td className="px-3 py-2 text-gray-400">{c.country || '—'}</td>
                    <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                    <td className="px-3 py-2 text-gray-400">{c.owner?.name || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{formatDate(c.lastContactAt)}</td>
                    <td className="px-3 py-2">
                      <span className={`font-mono ${c.churnRisk >= 60 ? 'text-market-down' : c.churnRisk >= 30 ? 'text-amber-400' : 'text-gray-400'}`}>
                        {c.churnRisk}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {c.interests.slice(0, 3).map((i) => (
                          <span key={i.interest} className="text-xs bg-market-bg border border-market-border px-1.5 py-0.5 rounded text-gray-400">{i.interest}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Main>
  )
}