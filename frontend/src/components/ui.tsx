import React from 'react'

export const inputCls =
  'w-full bg-market-bg/70 border border-market-border rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-market-accent/40 focus:border-market-accent/50 transition-all'

export const selectCls = inputCls.replace('px-4 py-2.5', 'px-3 py-2.5')

export function Button({
  children, onClick, type = 'button', variant = 'primary', size = 'md', className = '', disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md'
  className?: string
  disabled?: boolean
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all rounded-xl disabled:opacity-60 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm' }
  const variants = {
    primary: 'bg-market-accent hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 active:scale-[0.98]',
    ghost: 'bg-market-border/40 hover:bg-market-border text-gray-300',
    danger: 'bg-market-down/10 hover:bg-market-down/20 text-market-down',
    outline: 'border border-market-border hover:border-market-accent/50 hover:text-white text-gray-400',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '', title, action }: {
  children: React.ReactNode
  className?: string
  title?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className={`bg-market-card/60 backdrop-blur-sm border border-market-border rounded-2xl p-5 shadow-lg shadow-black/10 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-sm font-semibold text-gray-200">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, hint, tone = 'default' }: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: 'default' | 'up' | 'down' | 'accent'
}) {
  const tones = {
    default: 'text-white',
    up: 'text-market-up',
    down: 'text-market-down',
    accent: 'text-market-accent',
  }
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${tones[tone]}`}>{value}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </Card>
  )
}

export function EmptyState({ title, description, icon = '📭' }: {
  title: string
  description?: string
  icon?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="text-3xl mb-3 opacity-60">{icon}</div>
      <p className="text-sm font-medium text-gray-400">{title}</p>
      {description && <p className="text-xs text-gray-600 mt-1">{description}</p>}
    </div>
  )
}

export function Field({ label, children, hint }: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-600 mt-1">{hint}</p>}
    </div>
  )
}

export function ChangeBadge({ value }: { value?: number | null }) {
  if (value === undefined || value === null) return <span className="text-gray-500 text-xs">—</span>
  const positive = value >= 0
  return (
    <span
      className={`text-xs font-medium px-1.5 py-0.5 rounded ${positive ? 'text-market-up bg-market-up/10' : 'text-market-down bg-market-down/10'}`}
    >
      {positive ? '+' : ''}{value.toFixed(2)}%
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-market-up/10 text-market-up',
    INACTIVE: 'bg-gray-500/10 text-gray-400',
    AT_RISK: 'bg-amber-500/10 text-amber-400',
    CHURNED: 'bg-market-down/10 text-market-down',
    OPEN: 'bg-blue-500/10 text-blue-400',
    IN_PROGRESS: 'bg-amber-500/10 text-amber-400',
    DONE: 'bg-market-up/10 text-market-up',
    CANCELLED: 'bg-gray-500/10 text-gray-400',
    BLOCKED: 'bg-red-500/10 text-red-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-500/10 text-gray-300'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function Table({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-market-border text-left">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5 text-xs font-semibold text-gray-400 whitespace-nowrap uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-market-border">{children}</tbody>
      </table>
      {empty && <div className="py-8">{empty}</div>}
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12">
      <div className="w-8 h-8 border-2 border-market-accent border-t-transparent rounded-full animate-spin" />
      {label && <p className="text-xs text-gray-500">{label}</p>}
    </div>
  )
}

export function formatPrice(value: number | null | undefined, currency = 'USD'): string {
  if (value === null || value === undefined) return '—'
  const locales: Record<string, string> = { USD: 'en-US', EUR: 'pt-PT', BRL: 'pt-BR' }
  const locale = locales[currency] || 'en-US'

  const opts: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency === 'EUR' ? 'EUR' : 'USD',
    maximumFractionDigits: value < 10 ? 4 : 2,
  }
  return new Intl.NumberFormat(locale, opts).format(value)
}

export function formatBigNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toString()
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date | null | undefined) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit' }).format(new Date(date))
}

export function timeAgo(date: string | Date | null | undefined, locale = 'pt'): string {
  if (!date) return '—'
  const then = new Date(date).getTime()
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000))
  const rtf = new Intl.RelativeTimeFormat(locale === 'en' ? 'en' : locale === 'es' ? 'es' : 'pt', { numeric: 'auto' })
  if (diffSec < 60) return rtf.format(-diffSec, 'second')
  if (diffSec < 3600) return rtf.format(-Math.floor(diffSec / 60), 'minute')
  if (diffSec < 86400) return rtf.format(-Math.floor(diffSec / 3600), 'hour')
  return rtf.format(-Math.floor(diffSec / 86400), 'day')
}

export function formatClock(date: string | Date | null | undefined, locale = 'pt'): string {
  if (!date) return '—'
  const l = locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'pt-PT'
  return new Intl.DateTimeFormat(l, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(date))
}

export function formatDateTime(date: string | Date | null | undefined, locale = 'pt'): string {
  if (!date) return '—'
  const l = locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'pt-PT'
  return new Intl.DateTimeFormat(l, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}