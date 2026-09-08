'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { disconnectSocket } from '@/lib/socket'
import { useI18n } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

interface User {
  id: string
  email: string
  name: string
  role: string
}

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useI18n()
  const [user, setUser] = useState<User | null>(null)

  const NAV = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: '🏠' },
    {
      href: '/market', label: t('nav.markets'), icon: '📊',
      children: [
        { href: '/market/stocks', label: t('nav.stocks') },
        { href: '/market/crypto', label: t('nav.crypto') },
        { href: '/market/forex', label: t('nav.forex') },
        { href: '/market/etfs', label: t('nav.etfs') },
        { href: '/market/indices', label: t('nav.indices') },
      ],
    },
    {
      href: '/research', label: t('nav.research'), icon: '🔎',
      children: [
        { href: '/research', label: t('nav.overview') },
        { href: '/research/sectors', label: t('nav.sectors') },
        { href: '/research/compare', label: t('nav.compare') },
      ],
    },
    { href: '/news', label: t('nav.news'), icon: '📰' },
    { href: '/macro', label: t('nav.macro'), icon: '🌍' },
    { href: '/calendar', label: t('nav.calendar'), icon: '🗓️' },
    { href: '/clients', label: t('nav.clients'), icon: '👥' },
    { href: '/retention', label: t('nav.retention'), icon: '🎯' },
    { href: '/deposits', label: t('nav.deposits'), icon: '💸' },
    { href: '/watchlist', label: t('nav.watchlist'), icon: '⭐' },
    { href: '/alerts', label: t('nav.alerts'), icon: '🔔' },
    { href: '/tasks', label: t('nav.tasks'), icon: '✅' },
    { href: '/reports', label: t('nav.reports'), icon: '📈' },
    { href: '/assistant', label: t('nav.assistant'), icon: '🤖' },
  ]

  const NAV_BOTTOM = [
    { href: '/notifications', label: t('nav.notifications'), icon: '🔔' },
    { href: '/integrations', label: t('nav.integrations'), icon: '🔌' },
    { href: '/admin', label: t('nav.admin'), icon: '⚙️' },
    { href: '/audit', label: t('nav.audit'), icon: '🛡️' },
    { href: '/health', label: t('nav.health'), icon: '💚' },
  ]

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

  return (
    <aside className="w-60 bg-market-card border-r border-market-border flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-market-border">
        <Link href="/dashboard" className="text-lg font-bold text-white">Market Now</Link>
        <p className="text-xs text-gray-500 mt-0.5">{t('nav.platform')}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {NAV.map((item) => (
          <div key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-0.5 ${
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-market-accent/20 text-market-accent font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-market-border'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
            {item.children && (
              <div className="ml-4 pl-2 border-l border-market-border">
                {item.children.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className={`block px-3 py-1.5 rounded text-xs ${
                      pathname === c.href
                        ? 'text-market-accent bg-market-accent/10'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-market-border">
        <div className="border-b border-market-border pb-2 mb-2">
          {NAV_BOTTOM.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs mb-0.5 ${
                pathname === item.href
                  ? 'text-market-accent bg-market-accent/10'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
        {user && (
          <div className="mb-2">
            <p className="text-sm font-medium text-gray-200">{user.name}</p>
            <p className="text-xs text-gray-500">{user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs text-market-down hover:opacity-80"
        >
          {t('nav.logout')}
        </button>
      </div>
      <div className="p-3 pt-0">
        <LanguageSwitcher compact />
      </div>
    </aside>
  )
}

export function Main({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-market-bg">
      <Sidebar />
      <main className="flex-1 p-6 ml-0">{children}</main>
    </div>
  )
}