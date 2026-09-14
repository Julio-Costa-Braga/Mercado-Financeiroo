// Limpeza dos dados de teste do seed (clientes, depositos, documentos, tasks,
// notificacoes, alertas e historico de IA que foram criados para demonstracao).
//
// Uso:
//   npm run db:cleanup               # remove tudo (mantem o cliente demo do portal)
//   npm run db:cleanup -- --all      # remove inclusive o cliente demo (client-joao)
//   DRY_RUN=1 npm run db:cleanup     # mostra o que seria removido sem apagar
//
// O cliente demo (client-joao) fica vinculado a conta cliente@mercado.com para
// o login do portal continuar funcionando; use --all para remove-lo tambem.
import { PrismaClient } from '@prisma/client'

const ALL = process.argv.includes('--all')
const DRY = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run')

const p = new PrismaClient()

const SEED_CLIENT_TITLES = [
  'Follow-up João - interesse em NVDA',
  'Ligar para Maria - risco de churn',
  'Reactivar Carlos',
  'Research - setor de AI',
  'Revisar portfolio Ana',
  'Compliance - check KYC',
]

const fmt = (qty: number) => (DRY ? `${qty} (simulação)` : String(qty))

async function main() {
  const deletes: Array<{
    label: string
    count: () => Promise<{ count: number }>
    run: () => Promise<{ count: number }>
  }> = [
    // Depositos/eventos financeiros do seed (meta.source = 'seed')
    {
      label: 'FinancialEvents do seed (depósitos de teste)',
      count: () =>
        p.financialEvent.count({
          where: { meta: { path: ['source'], equals: 'seed' } } as any,
        }) as any,
      run: () =>
        p.financialEvent.deleteMany({
          where: { meta: { path: ['source'], equals: 'seed' } } as any,
        }),
    },

    // Precisamos achar os clientes do seed: ids determinísticos do seed (client-*)
    {
      label: 'Clientes do seed',
      count: async () => {
        const where: any = { id: { startsWith: 'client-' } }
        if (!ALL) where.id = { startsWith: 'client-', not: 'client-joao' }
        return p.client.count({ where }) as any
      },
      run: async () => {
        const where: any = { id: { startsWith: 'client-' } }
        if (!ALL) where.id = { startsWith: 'client-', not: 'client-joao' }
        const res = await p.client.deleteMany({ where })
        return res
      },
    },

    // Documento de exemplo do João
    {
      label: 'Documento demo (doc-joao-exemplo)',
      count: () =>
        p.clientDocument.count({ where: { id: 'doc-joao-exemplo' } }) as any,
      run: () =>
        p.clientDocument.deleteMany({ where: { id: 'doc-joao-exemplo' } }),
    },

    // Tasks do seed (títulos determinísticos)
    {
      label: 'Tasks do seed',
      count: () =>
        p.task.count({ where: { title: { in: SEED_CLIENT_TITLES } } }) as any,
      run: () => p.task.deleteMany({ where: { title: { in: SEED_CLIENT_TITLES } } }),
    },

    // Notificações do seed (ids notif-*)
    {
      label: 'Notificações do seed',
      count: () =>
        p.notification.count({ where: { id: { startsWith: 'notif-' } } }) as any,
      run: () => p.notification.deleteMany({ where: { id: { startsWith: 'notif-' } } }),
    },

    // Histórico de request de IA demo
    {
      label: 'AiRequest demo (ai-sample)',
      count: () => p.aiRequest.count({ where: { id: 'ai-sample' } }) as any,
      run: () => p.aiRequest.deleteMany({ where: { id: 'ai-sample' } }),
    },

    // Alertas do seed (criados pelo user julio; sem id determinístico, então
    // removemos os alertas vinculados a clientes seed e aos assets de seed que
    // ainda não fazem sentido reter. Mantém alertas criados manualmente pelos users).
    {
      label: 'Alertas vinculados a clientes/seed',
      count: async () => {
        const seedClientIds = await p.client.findMany({
          where: { id: { startsWith: 'client-' } },
          select: { id: true },
        })
        return p.alert.count({
          where: { clientId: { in: seedClientIds.map((c) => c.id) } },
        }) as any
      },
      run: async () => {
        const seedClientIds = await p.client.findMany({
          where: { id: { startsWith: 'client-' } },
          select: { id: true },
        })
        return p.alert.deleteMany({
          where: { clientId: { in: seedClientIds.map((c) => c.id) } },
        })
      },
    },
  ]

  console.log('Limpeza dos dados de teste')
  console.log(`Modo: ${DRY ? 'DRY-RUN (nada será apagado)' : ALL ? 'LIMPEZA TOTAL' : 'PARCIAL (mantém cliente demo do portal)'}`)
  console.log('-'.repeat(60))

  let total = 0
  for (const step of deletes) {
    try {
      const res = DRY ? { count: await step.count() } : await step.run()
      total += res.count
      console.log(`${step.label}: ${fmt(res.count)}`)
    } catch (e: any) {
      console.error(`Falha em "${step.label}": ${e?.message}`)
    }
  }

  console.log('-'.repeat(60))
  console.log(`Total de registros: ${fmt(total)}`)
  console.log(DRY ? 'Nada foi alterado.' : 'Limpeza concluída.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await p.$disconnect()
  })