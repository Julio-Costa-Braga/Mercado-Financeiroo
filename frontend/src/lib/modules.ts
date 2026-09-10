// Módulos de acesso por usuário (espelha backend/src/config/modules.ts).
// A sidebar filtra as seções pelo conjunto de módulos do usuário; os defaults
// por papel evitam expor áreas de outros times sem configuração explícita.

export const MODULES = [
  'dashboard',
  'market',
  'research',
  'news',
  'macro',
  'calendar',
  'clients',
  'sales',
  'retention',
  'deposits',
  'tasks',
  'reports',
  'assistant',
  'notifications',
  'watchlist',
  'alerts',
  'integrations',
  'admin',
  'audit',
  'health',
] as const

export type AppModule = (typeof MODULES)[number]

export const ALL_MODULES: string[] = [...MODULES]

export const DEFAULT_MODULES_BY_ROLE: Record<string, string[]> = {
  ADMIN: ALL_MODULES,
  MANAGER: ALL_MODULES,
  CRM: ALL_MODULES,
  SALES: [
    'dashboard', 'market', 'research', 'news', 'macro', 'calendar',
    'clients', 'sales', 'deposits', 'tasks', 'assistant', 'notifications',
    'watchlist', 'alerts',
  ],
  RETENTION: [
    'dashboard', 'market', 'research', 'news', 'macro', 'calendar',
    'clients', 'retention', 'deposits', 'tasks', 'reports', 'assistant',
    'notifications', 'watchlist', 'alerts',
  ],
  RESEARCH: [
    'dashboard', 'market', 'research', 'news', 'macro', 'calendar',
    'reports', 'assistant', 'notifications', 'watchlist', 'alerts',
  ],
  COMPLIANCE: [
    'dashboard', 'clients', 'retention', 'deposits', 'reports',
    'notifications', 'watchlist', 'alerts', 'audit',
  ],
  CLIENT: [],
}

export function effectiveModules(role: string, modules?: string[]): string[] {
  if (modules && modules.length) {
    return modules.filter((m) => (MODULES as readonly string[]).includes(m))
  }
  return DEFAULT_MODULES_BY_ROLE[role] || ALL_MODULES
}

export type ModuleGroup = 'market' | 'ops' | 'system'

export interface ModuleOption {
  key: AppModule
  label: string
  group: ModuleGroup
}

export const MODULE_OPTIONS: ModuleOption[] = [
  { key: 'dashboard', label: 'Dashboard', group: 'market' },
  { key: 'market', label: 'Mercado', group: 'market' },
  { key: 'research', label: 'Análise', group: 'market' },
  { key: 'news', label: 'Notícias', group: 'market' },
  { key: 'macro', label: 'Macro', group: 'market' },
  { key: 'calendar', label: 'Calendário', group: 'market' },
  { key: 'clients', label: 'Clientes (CRM)', group: 'ops' },
  { key: 'sales', label: 'Vendas (pipeline)', group: 'ops' },
  { key: 'retention', label: 'Retenção', group: 'ops' },
  { key: 'deposits', label: 'Depósitos', group: 'ops' },
  { key: 'tasks', label: 'Tarefas', group: 'ops' },
  { key: 'reports', label: 'KPIs', group: 'ops' },
  { key: 'assistant', label: 'Assistente IA', group: 'ops' },
  { key: 'watchlist', label: 'Watchlist', group: 'ops' },
  { key: 'alerts', label: 'Alertas', group: 'ops' },
  { key: 'notifications', label: 'Notificações', group: 'system' },
  { key: 'integrations', label: 'Integrações', group: 'system' },
  { key: 'admin', label: 'Administração', group: 'system' },
  { key: 'audit', label: 'Auditoria', group: 'system' },
  { key: 'health', label: 'Saúde do sistema', group: 'system' },
]

export const MODULE_GROUPS: Array<{ key: ModuleGroup; label: string }> = [
  { key: 'market', label: 'Mercado' },
  { key: 'ops', label: 'Equipe' },
  { key: 'system', label: 'Sistema' },
]