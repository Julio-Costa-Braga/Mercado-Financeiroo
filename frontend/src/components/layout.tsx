'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { disconnectSocket } from '@/lib/socket'

interface User {
  id: string
  email: string
  name: string
  role: string
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  {
    href: '/market', label: 'Markets', icon: '📊',
    children: [
      { href: '/market/stocks', label: 'Ações' },
      { href: '/market/crypto', label: 'Crypto' },
      { href: '/market/forex', label: 'Forex' },
    ],
  },
  { href: '/research', label: 'Research', icon: '🔎' },
  { href: '/news', label: 'Notícias', icon: '📰' },
  { href: '/clients', label: 'Clientes', icon: '👥' },
  { href: '/retention', label: 'Retention', icon: '🎯' },
  { href: '/watchlist', label: 'Watchlist', icon: '⭐' },
  { href: '/alerts', label: 'Alertas', icon: '🔔' },
  { href: '/tasks', label: 'Tarefas', icon: '✅' },
]

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
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

  return (
    <aside className="w-60 bg-market-card border-r border-market-border flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-market-border">
        <Link href="/dashboard" className="text-lg font-bold text-white">Market Now</Link>
        <p className="text-xs text-gray-500 mt-0.5">Plataforma de Mercado</p>
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
          Sair
        </button>
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