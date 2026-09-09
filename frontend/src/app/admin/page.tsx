'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Button, Card, EmptyState, PageHeader, Spinner, StatusBadge, Table, formatDate, inputCls, selectCls } from '@/components/ui'
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
      <PageHeader
        title="Administração"
        subtitle="Usuários, papéis e permissões"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                </svg>
                Novo usuário
              </>
            )}
          </Button>
        }
      />

      {message && <p className="text-xs text-market-accent mb-3">{message}</p>}

      {showForm && (
        <Card className="mb-4" title="Novo usuário">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input name="name" placeholder="Nome" required className={inputCls} />
            <input name="email" type="email" placeholder="E-mail" required className={inputCls} />
            <input name="password" placeholder="Senha" defaultValue="Mudar123!" className={inputCls} />
            <select name="role" className={selectCls}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input name="team" placeholder="Time" className={`${inputCls} flex-1`} />
              <Button type="submit" size="sm">Criar</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4">
        <div className="w-72">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuários..."
            className={inputCls}
          />
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <Card>
          {users.length === 0 ? (
            <EmptyState title="Nenhum usuário" description="Crie um novo usuário ou ajuste a busca." />
          ) : (
            <Table headers={['Usuário', 'Papel', 'Time', 'Status', 'Último login', '']}>
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
                    <Button variant="ghost" size="sm" onClick={() => toggleStatus(u)}>
                      {u.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}
    </Main>
  )
}