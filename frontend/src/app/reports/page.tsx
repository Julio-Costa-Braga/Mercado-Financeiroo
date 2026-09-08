'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, Spinner, StatusBadge, formatBigNumber, formatPrice } from '@/components/ui'
import { api } from '@/lib/api'

interface KPIs {
  retention: {
    activeClients: number
    churned: number
    total: number
    retentionRate: number
    reactivated30: number
    atRisk: number
  }
  atendimento: {
    contacts: number
    contacts30d: number
    tasks: number
    openTasks: number
    doneTasks: number
    completionRate: number
  }
  financeiro: {
    ftdCount: number
    ftdTotal: number
    repeatDepositCount: number
    repeatDepositTotal: number
    withdrawalCount: number
    withdrawalTotal: number
    netDeposits: number
  }
  agents: Array<{
    agent: string
    contacts: number
    activeClients: number
    churn: number
    completedTasks: number
  }>
}

export default function ReportsPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<KPIs>('/reports/kpis')
      setKpis(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Main>
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white">KPIs e Relatórios</h1>
        <p className="text-sm text-gray-500">Indicadores de retenção, atendimento e financeiro</p>
      </header>

      {loading ? (
        <Spinner />
      ) : kpis ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Card title="Retenção">
              <p className="text-2xl font-bold text-white">{kpis.retention.retentionRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Taxa de retenção</p>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{kpis.retention.activeClients} ativos</span>
                <span>{kpis.retention.churned} perdidos</span>
              </div>
              <StatusBadge status={kpis.retention.atRisk > 0 ? 'AT_RISK' : 'ACTIVE'} />
            </Card>

            <Card title="Atendimento">
              <p className="text-2xl font-bold text-white">{kpis.atendimento.contacts}</p>
              <p className="text-xs text-gray-500 mt-1">Contatos totais</p>
              <p className="text-xs text-gray-500 mt-2">{kpis.atendimento.contacts30d} nos últimos 30 dias</p>
            </Card>

            <Card title="Tarefas">
              <p className="text-2xl font-bold text-white">{kpis.atendimento.openTasks}</p>
              <p className="text-xs text-gray-500 mt-1">Em aberto</p>
              <p className="text-xs text-gray-500 mt-2">Conclusão: {kpis.atendimento.completionRate}%</p>
            </Card>

            <Card title="Depósitos líquidos">
              <p className={`text-2xl font-bold ${kpis.financeiro.netDeposits >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                {formatPrice(kpis.financeiro.netDeposits)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{kpis.financeiro.ftdCount} FTD</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card title="Financeiro">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>FTD (total)</span>
                  <span>{kpis.financeiro.ftdCount} · {formatBigNumber(kpis.financeiro.ftdTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Depósitos recorrentes</span>
                  <span>{kpis.financeiro.repeatDepositCount} · {formatBigNumber(kpis.financeiro.repeatDepositTotal)}</span>
                </div>
                <div className="flex justify-between text-market-down">
                  <span>Saques</span>
                  <span>{kpis.financeiro.withdrawalCount} · {formatBigNumber(kpis.financeiro.withdrawalTotal)}</span>
                </div>
              </div>
            </Card>

            <Card title="Performance por agente">
              <div className="space-y-3">
                {kpis.agents.map((a) => (
                  <div key={a.agent}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{a.agent}</span>
                      <span className="text-gray-500">{a.activeClients} ativos · {a.completedTasks} tarefas</span>
                    </div>
                    <div className="h-1.5 bg-market-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-market-accent rounded-full"
                        style={{ width: `${Math.min(100, a.completedTasks * 5)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {kpis.agents.length === 0 && <p className="text-gray-500 text-sm">Sem agentes nos grupos de retenção/vendas.</p>}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </Main>
  )
}