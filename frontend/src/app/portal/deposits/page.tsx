'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Main } from '@/components/layout'
import { Card, PageHeader, Spinner, StatCard, EmptyState, formatDate, Button, inputCls } from '@/components/ui'
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
  return (
    <React.Suspense fallback={null}>
      <PortalDeposits />
    </React.Suspense>
  )
}

function PortalDeposits() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const [events, setEvents] = useState<FinancialEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const status = searchParams.get('stripe')
    if (status === 'success') {
      setMsg(t('portal.deposits.stripe.success'))
      router.replace('/portal/deposits')
    } else if (status === 'canceled') {
      setMsg(t('portal.deposits.stripe.canceled'))
      router.replace('/portal/deposits')
    }
  }, [searchParams, router, t])

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
  const hasFirstDeposit = events.some((e) => ['INITIAL_DEPOSIT', 'FTD', 'DEPOSIT', 'REPEAT_DEPOSIT'].includes(e.type))

  async function startCheckout() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 1) {
      setMsg(t('portal.deposits.stripe.error'))
      return
    }
    try {
      setPaying(true)
      setMsg('')
      const d = await api.post<{ url: string }>('/payments/checkout', { amount: value })
      window.location.href = d.url
    } catch (err: any) {
      setMsg(err.message || t('portal.deposits.stripe.error'))
      setPaying(false)
    }
  }

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

      <Card title={t('portal.deposits.stripe.title')} className="mb-6">
        {hasFirstDeposit ? (
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="block text-xs text-gray-500 mb-1">{t('portal.deposits.stripe.amount')}</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">$</span>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('portal.deposits.stripe.amountPh')}
                  className={inputCls}
                />
              </div>
            </div>
            <Button onClick={startCheckout} disabled={paying}>
              {paying ? t('portal.deposits.stripe.loading') : t('portal.deposits.stripe.submit')}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
            <p className="text-sm font-semibold text-amber-300">{t('portal.deposits.firstDeposit.title')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('portal.deposits.firstDeposit.desc')}</p>
            <p className="text-xs text-gray-500 mt-2">{t('portal.deposits.firstDeposit.hint')}</p>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3">{t('portal.deposits.stripe.hint')}</p>
        {msg && <p className="text-xs text-market-accent mt-2">{msg}</p>}
      </Card>

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