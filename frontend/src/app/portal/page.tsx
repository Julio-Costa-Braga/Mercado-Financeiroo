'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Main } from '@/components/layout'
import { Card, PageHeader, Spinner, StatCard, EmptyState, formatDate } from '@/components/ui'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

interface PortalOverview {
  client: {
    id: string
    name: string
    email: string
    country: string
    riskProfile: string
    clientType: string
  }
  totals: {
    deposits: number
    depositAmount: number
    documents: number
    interactions: number
  }
  recentDocuments: Array<{ id: string; name: string; category: string; createdAt: string }>
  alerts: Array<{ id: string; type: string; title: string; alertKey?: string }>
}

export default function PortalPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [data, setData] = useState<PortalOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const d = await api.get<{ overview: PortalOverview }>('/portal/overview')
      setData(d.overview)
      setError('')
    } catch (err: any) {
      if (err.message === 'Não autorizado' || err.status === 401) {
        router.push('/login')
        return
      }
      setError(err.message || 'Erro ao carregar o portal')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Main><Spinner /></Main>

  if (error || !data) {
    return (
      <Main>
        <PageHeader title={t('portal.title')} subtitle={t('portal.subtitle')} />
        <EmptyState title={error || 'Sem dados'} />
      </Main>
    )
  }

  const c = data.client

  return (
    <Main>
      <PageHeader
        title={t('portal.title')}
        subtitle={`${c.name} — ${c.email || ''}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t('portal.totalDeposits')} value={`$${data.totals.depositAmount.toLocaleString('en-US')}`} hint={`${data.totals.deposits}`} tone="up" />
        <StatCard label={t('portal.documents')} value={data.totals.documents} hint={t('portal.documentsHint')} />
        <StatCard label={t('portal.interactions')} value={data.totals.interactions} hint={t('portal.interactionsHint')} />
        <StatCard
          label={t('portal.profile')}
          value={<span className="text-lg">{c.riskProfile || '—'}</span>}
          hint={`${c.clientType || ''}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card
          title={t('portal.documents')}
          action={
            <Link href="/portal/documents" className="text-xs text-market-accent hover:underline">
              {t('portal.seeAll')}
            </Link>
          }
        >
          {data.recentDocuments.length === 0 ? (
            <EmptyState title={t('portal.noDocuments')} description={t('portal.noDocumentsDesc')} />
          ) : (
            <ul className="divide-y divide-market-border/60">
              {data.recentDocuments.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="text-gray-200 truncate">{doc.name}</p>
                    <p className="text-[11px] text-gray-500">{doc.category}</p>
                  </div>
                  <span className="text-[11px] text-gray-500 shrink-0 ml-3">{formatDate(doc.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('portal.operations')}>
          <div className="space-y-3">
            <Link
              href="/portal/deposits"
              className="flex items-center justify-between rounded-xl border border-market-border bg-market-bg/60 px-4 py-3 hover:border-market-accent/50 transition-all"
            >
              <span className="text-sm text-gray-300">{t('portal.depositsLink')}</span>
              <span className="text-xs text-market-accent">→</span>
            </Link>
            <Link
              href="/portal/documents"
              className="flex items-center justify-between rounded-xl border border-market-border bg-market-bg/60 px-4 py-3 hover:border-market-accent/50 transition-all"
            >
              <span className="text-sm text-gray-300">{t('portal.documentsLink')}</span>
              <span className="text-xs text-market-accent">→</span>
            </Link>
          </div>
        </Card>
      </div>

      {data.alerts.length > 0 && (
        <Card title={t('portal.alerts.title')}>
          <ul className="divide-y divide-market-border/60">
            {data.alerts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 uppercase">{a.type}</span>
                <span className="text-gray-300">{a.title}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Main>
  )
}