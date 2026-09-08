import React from 'react'

export function Card({ children, className = '', title, action }: {
  children: React.ReactNode
  className?: string
  title?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className={`bg-market-card border border-market-border rounded-lg p-4 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h3 className="text-sm font-semibold text-gray-200">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

export function ChangeBadge({ value }: { value?: number | null }) {
  if (value === undefined || value === null) return <span className="text-gray-500 text-xs">—</span>
  const positive = value >= 0
  return (
    <span
      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
        positive ? 'text-market-up bg-market-up/10' : 'text-market-down bg-market-down/10'
      }`}
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

export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-market-border text-left">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-xs font-medium text-gray-400 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-market-border">{children}</tbody>
      </table>
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-8 h-8 border-2 border-market-accent border-t-transparent rounded-full animate-spin" />
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