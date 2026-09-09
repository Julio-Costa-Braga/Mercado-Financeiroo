'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, EmptyState, PageHeader, Spinner, formatDate, inputCls } from '@/components/ui'
import { api } from '@/lib/api'

interface AuditLog {
  id: string
  action: string
  entity: string | null
  entityId: string | null
  before: any | null
  after: any | null
  ip: string | null
  createdAt: string
  user: { id: string; name: string; email: string } | null
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [userFilter, setUserFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (userFilter) params.set('user', userFilter)
      const data = await api.get<{ logs: AuditLog[] }>(`/audit?${params.toString()}`)
      setLogs(data.logs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, userFilter])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  return (
    <Main>
      <PageHeader title="Auditoria" subtitle="Trilha de ações para compliance" />

      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por ação/entidade..."
          className={`${inputCls} flex-1`}
        />
        <div className="w-56">
          <input
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            placeholder="Id do usuário"
            className={inputCls}
          />
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <Card>
          {logs.length === 0 ? (
            <EmptyState title="Nenhum registro de auditoria" description="Não há eventos para os filtros atuais." />
          ) : (
            <div className="divide-y divide-market-border">
              {logs.map((l) => (
                <div key={l.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-200">{l.action.replace(/\./g, ' · ')}</p>
                    <span className="text-xs text-gray-600">{formatDate(l.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>{l.user?.name || '—'}</span>
                    {l.entity && (
                      <span className="bg-market-border/40 border border-market-border px-2 py-0.5 rounded">
                        {l.entity}{l.entityId ? `:${l.entityId.slice(0, 8)}` : ''}
                      </span>
                    )}
                    {l.ip && <span className="text-gray-600">IP {l.ip}</span>}
                  </div>
                  {(l.before || l.after) && (
                    <pre className="mt-2 text-[11px] text-gray-500 bg-market-bg border border-market-border rounded-md p-2 overflow-x-auto">
                      {JSON.stringify({ before: l.before ?? null, after: l.after ?? null }, null, 1)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </Main>
  )
}