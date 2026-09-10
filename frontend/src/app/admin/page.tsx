'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Button, Card, EmptyState, PageHeader, Spinner, StatusBadge, Table, formatDate, inputCls, selectCls } from '@/components/ui'
import { api } from '@/lib/api'
import { MODULE_GROUPS, MODULE_OPTIONS, effectiveModules } from '@/lib/modules'

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  team: string | null
  modules?: string[]
  status: string
  timezone: string | null
  locale: string | null
  currency: string | null
  lastLoginAt: string | null
  createdAt: string
}

const ROLES = ['ADMIN', 'MANAGER', 'CRM', 'RETENTION', 'SALES', 'RESEARCH', 'COMPLIANCE', 'CLIENT']
const STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED']

function ModulePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (k: string) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k])
  return (
    <div className="space-y-2.5">
      {MODULE_GROUPS.map((g) => (
        <div key={g.key}>
          <p className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-1">{g.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {MODULE_OPTIONS.filter((m) => m.group === g.key).map((m) => {
              const on = value.includes(m.key)
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => toggle(m.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${on ? 'bg-market-accent/15 text-market-accent border-market-accent/40' : 'border-market-border text-gray-500 hover:text-gray-300'}`}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function RoleSelect({ value, onChange }: { value: string; onChange: (r: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      {ROLES.map((r) => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  )
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [formRole, setFormRole] = useState('SALES')
  const [formModules, setFormModules] = useState<string[]>(effectiveModules('SALES'))

  const [editId, setEditId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editModules, setEditModules] = useState<string[]>([])

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
        role: formRole,
        team: fd.get('team') || undefined,
        modules: formModules,
      })
      setMessage('Usuário criado! Acessos configurados.')
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

  function openEdit(u: AdminUser) {
    if (editId === u.id) {
      setEditId(null)
      return
    }
    setEditId(u.id)
    setEditRole(u.role)
    setEditModules(effectiveModules(u.role, u.modules))
  }

  async function saveEdit(u: AdminUser) {
    try {
      await api.put(`/admin/users/${u.id}`, { role: editRole, modules: editModules })
      setMessage(`Acessos de ${u.name} atualizados!`)
      setEditId(null)
      load()
    } catch (err: any) {
      setMessage(err.message || 'Erro ao salvar acessos')
    }
  }

  return (
    <Main>
      <PageHeader
        title="Administração"
        subtitle="Usuários, papéis e permissões por área"
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
          <p className="text-xs text-gray-500 mb-4">Escolha o cargo e marque quais áreas este funcionário pode acessar.</p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input name="name" placeholder="Nome" required className={inputCls} />
              <input name="email" type="email" placeholder="E-mail" required className={inputCls} />
              <input name="password" placeholder="Senha" defaultValue="Mudar123!" className={inputCls} />
              <RoleSelect
                value={formRole}
                onChange={(r) => {
                  setFormRole(r)
                  setFormModules(effectiveModules(r))
                }}
              />
              <input name="team" placeholder="Time" className={inputCls} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">Acessos (áreas visíveis)</p>
              <ModulePicker value={formModules} onChange={setFormModules} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm">Criar usuário</Button>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-market-border">
                    <th className="pb-2 pr-4">Usuário</th>
                    <th className="pb-2 pr-4">Papel</th>
                    <th className="pb-2 pr-4">Acessos</th>
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Último login</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <React.Fragment key={u.id}>
                      <tr className="border-b border-market-border/50">
                        <td className="px-0 py-2.5 pr-4 align-top">
                          <p className="text-gray-200 font-medium">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-400">{u.role}</td>
                        <td className="py-2.5 pr-4">
                          <button onClick={() => openEdit(u)} className="text-xs text-market-accent hover:underline">
                            {(u.modules || []).length} áreas
                          </button>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-400">{u.team || '—'}</td>
                        <td className="py-2.5 pr-4"><StatusBadge status={u.status} /></td>
                        <td className="py-2.5 pr-4 text-gray-400 whitespace-nowrap">{formatDate(u.lastLoginAt)}</td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Acessos</Button>
                          <span className="inline-block w-2" />
                          <Button variant="ghost" size="sm" onClick={() => toggleStatus(u)}>
                            {u.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                          </Button>
                        </td>
                      </tr>
                      {editId === u.id && (
                        <tr className="border-b border-market-border/50 bg-market-bg/40">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Cargo:</span>
                                  <RoleSelect value={editRole} onChange={setEditRole} />
                                </div>
                                <Button size="sm" onClick={() => saveEdit(u)}>Salvar acessos</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancelar</Button>
                              </div>
                              <ModulePicker value={editModules} onChange={setEditModules} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </Main>
  )
}