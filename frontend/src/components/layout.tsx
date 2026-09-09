'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { connectSocket, getSocket, disconnectSocket } from '@/lib/socket'
import { useI18n } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

interface User {
  id: string
  email: string
  name: string
  role: string
}

function Icon({ d, className = 'w-4 h-4' }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const ICONS: Record<string, string> = {
  dashboard: 'M4 5a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm8 0a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2V5zM4 15a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zm8 0a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4z',
  market: 'M3 13l4-4 4 4 5-6 5 5M3 20h18',
  research: 'M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z',
  news: 'M4 6h16M4 10h16M4 14h10M4 18h6m-8-14h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z',
  macro: 'M3 21h18M4 18h16M6 15V9m4 6V5m4 10v-3m4 3V8',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a1 1 0 011 1v15a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z',
  clients: 'M17 20v-1a4 4 0 00-8 0v1m4-7a3 3 0 100-6 3 3 0 000 6zm7 7v-1a4 4 0 00-2.5-3.7M9 14H6a4 4 0 00-4 4v1',
  retention: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  deposits: 'M3 10h18M3 10V6a1 1 0 011-1h16a1 1 0 011 1v4M3 10v8a1 1 0 001 1h16a1 1 0 001-1v-8m-10 0h6',
  watchlist: 'M11.48 3.5l1.9 3.85 4.25.62-3.08 3 0.73 4.24-3.8-2-3.8 2 0.73-4.24-3.08-3 4.25-.62z',
  alerts: 'M15 17h5l-1.4-1.6A5 5 0 0117 12V9a5 5 0 00-10 0v3a5 5 0 01-0.6 2.4L5 17h5m5 0v1a3 3 0 11-6 0v-1m6 0H10',
  tasks: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2m-6 0a2 2 0 002-2h2a2 2 0 002 2m-6 0h6m-6 6l2 2 4-4',
  reports: 'M3 17l5-6 4 4 6-8M3 20h18',
  assistant: 'M12 3a5 5 0 015 5v1a3 3 0 013 3v4a3 3 0 01-3 3H7a3 3 0 01-3-3v-4a3 3 0 013-3V8a5 5 0 015-5zm-3 12h.01M15 15h.01M9 12h.01M15 12h.01',
  notifications: 'M15 17h5l-1.4-1.6A5 5 0 0117 12V9a5 5 0 00-10 0v3a5 5 0 01-0.6 2.4L5 17h5m5 0v1a3 3 0 11-6 0v-1m6 0H10',
  integrations: 'M12 3v3m0 12v3m9-9h-3M6 12H3m14.3-6.3l-2.1 2.1m-6.4 6.4l-2.1 2.1m13.6.0l-2.1-2.1m-6.4-6.4L8.2 5.7M12 3a9 9 0 100 18 9 9 0 000-18zm0 6a3 3 0 100 6 3 3 0 000-6z',
  admin: 'M10.3 4.3L12 3l1.7 1.3 2.1-.1 0.6 2 1.8 1.1-0.8 1.9 1 1.9-1.9 1-.1 2-2.1.6-0.7 1.9-2-.5-2 .5-0.7-1.9-2.1-.6-.1-2-1.9-1 1-1.9L6.3 6.2L6.2 4.1zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  audit: 'M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4zm3 8l-4 4-2-2',
  health: 'M4.3 7A6 6 0 0112 6a6 6 0 019.3 7.5M12 6v14m-4-4h8',
}

interface NavItem {
  href: string
  labelKey: string
  icon: keyof typeof ICONS
}

const NAV: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: 'dashboard' },
  { href: '/market/stocks', labelKey: 'nav.markets', icon: 'market' },
  { href: '/research', labelKey: 'nav.research', icon: 'research' },
  { href: '/news', labelKey: 'nav.news', icon: 'news' },
  { href: '/macro', labelKey: 'nav.macro', icon: 'macro' },
  { href: '/calendar', labelKey: 'nav.calendar', icon: 'calendar' },
  { href: '/clients', labelKey: 'nav.clients', icon: 'clients' },
  { href: '/retention', labelKey: 'nav.retention', icon: 'retention' },
  { href: '/deposits', labelKey: 'nav.deposits', icon: 'deposits' },
  { href: '/watchlist', labelKey: 'nav.watchlist', icon: 'watchlist' },
  { href: '/alerts', labelKey: 'nav.alerts', icon: 'alerts' },
  { href: '/tasks', labelKey: 'nav.tasks', icon: 'tasks' },
  { href: '/reports', labelKey: 'nav.reports', icon: 'reports' },
  { href: '/assistant', labelKey: 'nav.assistant', icon: 'assistant' },
]

const NAV_BOTTOM: NavItem[] = [
  { href: '/notifications', labelKey: 'nav.notifications', icon: 'notifications' },
  { href: '/integrations', labelKey: 'nav.integrations', icon: 'integrations' },
  { href: '/admin', labelKey: 'nav.admin', icon: 'admin' },
  { href: '/audit', labelKey: 'nav.audit', icon: 'audit' },
  { href: '/health', labelKey: 'nav.health', icon: 'health' },
]

const PATH_TITLES: Array<{ prefix: string; labelKey: string }> = [
  { prefix: '/dashboard', labelKey: 'nav.dashboard' },
  { prefix: '/market', labelKey: 'nav.markets' },
  { prefix: '/research', labelKey: 'nav.research' },
  { prefix: '/news', labelKey: 'nav.news' },
  { prefix: '/macro', labelKey: 'nav.macro' },
  { prefix: '/calendar', labelKey: 'nav.calendar' },
  { prefix: '/clients', labelKey: 'nav.clients' },
  { prefix: '/retention', labelKey: 'nav.retention' },
  { prefix: '/deposits', labelKey: 'nav.deposits' },
  { prefix: '/watchlist', labelKey: 'nav.watchlist' },
  { prefix: '/alerts', labelKey: 'nav.alerts' },
  { prefix: '/tasks', labelKey: 'nav.tasks' },
  { prefix: '/reports', labelKey: 'nav.reports' },
  { prefix: '/assistant', labelKey: 'nav.assistant' },
  { prefix: '/notifications', labelKey: 'nav.notifications' },
  { prefix: '/integrations', labelKey: 'nav.integrations' },
  { prefix: '/admin', labelKey: 'nav.admin' },
  { prefix: '/audit', labelKey: 'nav.audit' },
  { prefix: '/health', labelKey: 'nav.health' },
]

function usePageTitle(pathname: string): string {
  const { t } = useI18n()
  const match = PATH_TITLES.find((p) => pathname === p.prefix || pathname.startsWith(p.prefix + '/'))
  if (match) return t(match.labelKey as any)
  if (pathname === '/login' || pathname === '/forgot-password') return ''
  return t('nav.dashboard')
}

function Logo() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l4-4 4 4 5-6 5 5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18" />
        </svg>
      </div>
      <div>
        <p className="text-base font-bold text-white leading-tight">Market Now</p>
        <p className="text-[10px] text-gray-500">Trading Platform</p>
      </div>
    </div>
  )
}

function SidebarItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const { t } = useI18n()
  const active = pathname === item.href || pathname.startsWith(item.href + '/')
  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5 transition-all ${
        active ? 'text-white bg-market-accent/15 font-medium' : 'text-gray-400 hover:text-white hover:bg-market-border/50'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-market-accent shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
      )}
      <Icon d={ICONS[item.icon]} className={active ? 'w-4.5 h-4.5 w-5 h-5 text-market-accent' : 'w-4.5 h-4.5 w-5 h-5'} />
      {t(item.labelKey as any)}
    </Link>
  )
}

function Topbar({ pathname }: { pathname: string }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [now, setNow] = useState(new Date())
  const [unread, setUnread] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const title = usePageTitle(pathname)

  useEffect(() => {
    const int = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(int)
  }, [])

  // Notificações em tempo real (badge + toast)
  useEffect(() => {
    if (!api.getToken()) return
    connectSocket()
    const socket = getSocket()
    if (!socket) return

    const refresh = async () => {
      try {
        const d = await api.get<{ unreadCount: number }>('/notifications?unread=true')
        setUnread(d.unreadCount)
      } catch {}
    }
    refresh()

    socket.on('notification:new', (p: any) => {
      setUnread((u) => u + 1)
      if (p?.title) setToast(p.body ? `${p.title} — ${p.body}` : p.title)
    })
    socket.on('alert:triggered', (p: any) => {
      if (p?.asset) setToast(`Alerta: ${p.asset} disparado`)
    })

    const hide = setTimeout(() => setToast(null), 6000)
    return () => {
      socket.off('notification:new')
      socket.off('alert:triggered')
      clearTimeout(hide)
    }
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-3 bg-market-bg/80 backdrop-blur-xl border-b border-market-border/70">
      <div className="flex items-center gap-2 text-sm min-w-0">
        <span className="text-gray-500 shrink-0">{t('app.name')}</span>
        {title && (
          <>
            <Icon d="M9 5l7 7-7 7" className="w-3.5 h-3.5 text-gray-700" />
            <span className="font-medium text-gray-200 truncate">{title}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-gray-400 tabular-nums font-mono">{formatClockStr(now, locale)}</span>
        <div className="w-px h-4 bg-market-border" />
        <button onClick={() => router.push('/notifications')} className="relative text-gray-400 hover:text-white transition-colors" aria-label="Notificações">
          <Icon d={ICONS.notifications} className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-market-down text-[10px] font-bold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
        <div className="w-px h-4 bg-market-border" />
        <LanguageSwitcher compact />
      </div>
      {toast && (
        <div className="fixed top-16 right-6 z-50 max-w-sm rounded-xl border border-market-accent/30 bg-market-card/95 backdrop-blur-xl shadow-2xl shadow-black/40 px-4 py-3 text-sm text-gray-200 animate-[fadein_0.2s_ease]">
          <div className="flex items-start gap-2">
            <span className="shrink-0 w-2 h-2 mt-1.5 rounded-full bg-market-accent shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
            <div className="min-w-0 break-words">{toast}</div>
            <button onClick={() => setToast(null)} className="shrink-0 text-gray-500 hover:text-white">✕</button>
          </div>
        </div>
      )}
    </header>
  )
}

function formatClockStr(d: Date, locale: 'pt' | 'en' | 'es'): string {
  const l = locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'pt-PT'
  return new Intl.DateTimeFormat(l, { hour: '2-digit', minute: '2-digit' }).format(d)
}

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useI18n()
  const [user, setUser] = useState<User | null>(null)

  const loadUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: User }>('/auth/me')
      setUser(data.user)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    if (api.getToken()) loadUser()
  }, [loadUser])

  async function handleLogout() {
    try {
      await api.post('/auth/logout')
    } catch {}
    api.clearTokens()
    disconnectSocket()
    router.push('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '??'

  return (
    <aside className="w-60 bg-market-card/40 backdrop-blur-sm border-r border-market-border flex flex-col h-screen sticky top-0 shrink-0">
      <div className="py-5 px-4 border-b border-market-border">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV.map((item) => (
          <SidebarItem key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="p-3 border-t border-market-border">
        <div className="border-b border-market-border pb-2 mb-2">
          {NAV_BOTTOM.map((item) => (
            <SidebarItem key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
        {user && (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-indigo-600/30 border border-market-accent/30 text-xs font-bold text-market-accent">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full mt-1 flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-market-down hover:bg-market-down/5 transition-all"
        >
          <Icon d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5A2.25 2.25 0 003.75 5.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15M12 12h9m0 0l-3-3m3 3l-3 3" />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  )
}

export function Main({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="flex min-h-screen bg-market-bg">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar pathname={pathname} />
        <main className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}