// Módulos de acesso por usuário.
// Cada funcionário pode ter um conjunto próprio de áreas visíveis (User.modules).
// Quando não configurado explicitamente, vale o default por papel.

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

const ALL: string[] = [...MODULES]

export const DEFAULT_MODULES_BY_ROLE: Record<string, string[]> = {
  ADMIN: ALL,
  MANAGER: ALL,
  CRM: ALL,
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

export function effectiveModules(user: { role: string; modules?: unknown }): string[] {
  const stored = Array.isArray(user.modules) ? (user.modules as string[]).filter((m) => typeof m === 'string') : []
  if (stored.length) {
    return stored.filter((m) => (MODULES as readonly string[]).includes(m))
  }
  return DEFAULT_MODULES_BY_ROLE[user.role] || ALL
}