'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, Spinner, Table, formatPrice } from '@/components/ui'
import { api } from '@/lib/api'

interface FinancialEvent {
  id: string
  type: string
  amount: number
  currency: string
  date: string
  client?: { id: string; name: string }
}

interface Dashboard {
  initialDeposits: { count: number; total: number }
  repeatDeposits: { count: number; total: number }
  withdrawals: { count: number; total: number }
  ftd: { count: number; total: number }
  netDeposits: { count: number; total: number }
  recent: FinancialEvent[]
}

const TYPE_LABELS: Record<string, string> = {
  INITIAL_DEPOSIT: 'Depósito Inicial',
  REPEAT_DEPOSIT: 'Depósito Recorrente',
  FTD: 'First Trade Deposit',
  WITHDRAWAL: 'Saque',
}

function typeColor(type: string) {
  if (type === 'WITHDRAWAL') return 'text-market-down'
  return 'text-market-up'
}

export default function DepositsPage() {
  const [dash, setDash] = useState<Dashboard | null>(null)
  const [events, setEvents] = useState<FinancialEvent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [d, ev] = await Promise.all([
        api.get<Dashboard>('/deposits/dashboard'),
        api.get<{ events: FinancialEvent[] }>('/deposits?limit=50'),
      ])
      setDash(d)
      setEvents(ev.events)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = [
    { label: 'Depósitos Iniciais', count: dash?.initialDeposits.count ?? 0, total: dash?.initialDeposits.total ?? 0 },
    { label: 'Depósitos Recorrentes', count: dash?.repeatDeposits.count ?? 0, total: dash?.repeatDeposits.total ?? 0 },
    { label: 'Sates', count: dash?.withdrawals.count ?? 0, total: dash?.withdrawals.total ?? 0 },
    { label: 'FTD', count: dash?.ftd.count ?? 0, total: dash?.ftd.total ?? 0 },
  ]

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white">Depósitos e Movimentações</h1>
        <p className="text-sm text-gray-500">Visão consolidada (somente leitura no MVP)</p>
      </header>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {stats.map((s) => (
              <Card key={s.label}>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-white mt-1">{s.count}</p>
                <p className="text-sm text-gray-400">{formatPrice(s.total)}</p>
              </Card>
            ))}
            <Card className="lg:col-span-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Depósitos líquidos</p>
                <p className={`text-2xl font-bold mt-1 ${(dash?.netDeposits.total ?? 0) >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                  {formatPrice(dash?.netDeposits.total ?? 0)}
                </p>
              </div>
              <p className="text-xs text-gray-500">{dash?.netDeposits.count ?? 0} operações líquidas</p>
            </Card>
          </div>

          <Card title="Movimentações recentes">
            <Table headers={['Data', 'Cliente', 'Tipo', 'Valor']}>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{new Date(e.date).toLocaleDateString('pt-PT')}</td>
                  <td className="px-3 py-2 text-gray-300">{e.client?.name ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs ${typeColor(e.type)}`}>{TYPE_LABELS[e.type] || e.type}</span>
                  </td>
                  <td className={`px-3 py-2 ${typeColor(e.type)}`}>
                    {e.amount > 0 ? '+' : ''}{formatPrice(e.amount, e.currency || 'USD')}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">Sem movimentações.</td></tr>
              )}
            </Table>
          </Card>
        </>
      )}
    </Main>
  )
}