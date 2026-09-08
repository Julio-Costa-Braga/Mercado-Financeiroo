'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, Spinner, StatusBadge, formatDate } from '@/components/ui'
import { api } from '@/lib/api'

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  team: string | null
  status: string
  timezone: string | null
  locale: string | null
  currency: string | null
  lastLoginAt: string | null
  createdAt: string
}

const ROLES = ['ADMIN', 'MANAGER', 'RETENTION', 'SALES', 'RESEARCH', 'COMPLIANCE']
const STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED']

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const data = await api.get<{ users: AdminUser[] }>(`/admin/users?${params.toString()}`)
      setUsers(data.users)
    } catch (err: any) {
      setMessage(err.message || 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await api.post('/admin/users', {
        name: fd.get('name'),
        email: fd.get('email'),
        password: fd.get('password'),
        role: fd.get('role'),
        team: fd.get('team') || undefined,
      })
      setMessage('Usuário criado!')
      setShowForm(false)
      load()
    } catch (err: any) {
      setMessage(err.message || 'Erro ao criar usuário')
    }
  }

  async function toggleStatus(u: AdminUser) {
    const next = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await api.put(`/admin/users/${u.id}`, { status: next })
      load()
    } catch (err: any) {
      setMessage(err.message || 'Erro')
    }
  }

  return (
    <Main>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Administração</h1>
          <p className="text-sm text-gray-500">Usuários, papéis e permissões</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-market-accent text-black text-sm font-medium px-4 py-2 rounded-md">
          {showForm ? 'Cancelar' : '+ Novo usuário'}
        </button>
      </header>

      {message && <p className="text-xs text-market-accent mb-3">{message}</p>}

      {showForm && (
        <Card className="mb-4" title="Novo usuário">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input name="name" placeholder="Nome" required className="bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm text-gray-200" />
            <input name="email" type="email" placeholder="E-mail" required className="bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm text-gray-200" />
            <input name="password" placeholder="Senha" defaultValue="Mudar123!" className="bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm text-gray-200" />
            <select name="role" className="bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm text-gray-300">
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input name="team" placeholder="Time" className="flex-1 bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm text-gray-200" />
              <button className="bg-market-accent text-black text-sm px-3 rounded-md">Criar</button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar usuários..."
          className="w-72 bg-market-card border border-market-border rounded-md px-3 py-2 text-sm text-gray-200"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-market-border text-left">
                  <th className="px-3 py-2 text-xs font-medium text-gray-400">Usuário</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-400">Papel</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-400">Time</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-400">Status</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-400">Último login</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-market-border">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 py-2.5">
                      <p className="text-gray-200 font-medium">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="px-3 py-2.5 text-gray-400">{u.role}</td>
                    <td className="px-3 py-2.5 text-gray-400">{u.team || '—'}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={u.status} /></td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{formatDate(u.lastLoginAt)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => toggleStatus(u)}
                        className="text-xs text-market-accent hover:opacity-80"
                      >
                        {u.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">Nenhum usuário.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Main>
  )
}