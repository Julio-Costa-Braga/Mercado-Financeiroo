'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Main } from '@/components/layout'
import { Card, PageHeader, Spinner, StatCard, EmptyState, formatDate, Button } from '@/components/ui'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

interface FinancialEvent {
  id: string
  type: string
  amount: number
  currency: string
  date: string
  meta?: any
}

const TYPE_COLORS: Record<string, string> = {
  DEPOSIT: 'text-market-up bg-market-up/10',
  INITIAL_DEPOSIT: 'text-market-up bg-market-up/10',
  REPEAT_DEPOSIT: 'text-market-up bg-market-up/10',
  FTD: 'text-market-up bg-market-up/10',
  WITHDRAWAL: 'text-market-down bg-market-down/10',
  FEE: 'text-amber-400 bg-amber-500/10',
  DIVIDEND: 'text-blue-400 bg-blue-500/10',
}

export default function PortalDepositsPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [events, setEvents] = useState<FinancialEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const d = await api.get<{ deposits: FinancialEvent[] }>('/portal/deposits')
      setEvents(d.deposits)
      setError('')
    } catch (err: any) {
      if (err.message === 'Não autorizado' || err.status === 401) {
        router.push('/login')
        return
      }
      setError(err.message || 'Erro ao carregar depósitos')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  const totalDeposits = events.filter((e) => ['DEPOSIT', 'INITIAL_DEPOSIT', 'REPEAT_DEPOSIT', 'FTD'].includes(e.type)).reduce((a, e) => a + e.amount, 0)
  const totalWithdrawals = events.filter((e) => e.type === 'WITHDRAWAL').reduce((a, e) => a + e.amount, 0)

  if (loading) return <Main><Spinner /></Main>

  return (
    <Main>
      <PageHeader
        title={t('portal.deposits.title')}
        subtitle={t('portal.deposits.subtitle')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label={t('portal.deposits.total')} value={`$${totalDeposits.toLocaleString('en-US')}`} tone="up" />
        <StatCard label={t('portal.deposits.withdrawals')} value={`$${totalWithdrawals.toLocaleString('en-US')}`} tone="down" />
        <StatCard label={t('portal.deposits.net')} value={`$${(totalDeposits + totalWithdrawals).toLocaleString('en-US')}`} tone="accent" />
      </div>

      <Card title={t('portal.deposits.history')}>
        {events.length === 0 ? (
          <EmptyState title={t('portal.noEvents')} description={t('portal.noEventsDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-market-border/60">
                  <th className="pb-2 pr-4">Tipo</th>
                  <th className="pb-2 pr-4">Valor</th>
                  <th className="pb-2 pr-4">Moeda</th>
                  <th className="pb-2">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-market-border/60">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-market-bg/40">
                    <td className="py-2.5 pr-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[e.type] || 'bg-gray-500/10 text-gray-400'}`}>
                        {e.type}
                      </span>
                    </td>
                    <td className={`py-2.5 pr-4 font-medium tabular-nums ${e.amount >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                      {e.amount >= 0 ? '+' : ''}
                      ${Math.abs(e.amount).toLocaleString('en-US')}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400">{e.currency}</td>
                    <td className="py-2.5 text-gray-500">{formatDate(e.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-6">
        <Button variant="ghost" onClick={() => router.push('/portal')}>
          ← {t('portal.back')}
        </Button>
      </div>
    </Main>
  )
}