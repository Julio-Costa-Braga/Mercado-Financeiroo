'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Main } from '@/components/layout'
import { Card, Spinner, formatDate } from '@/components/ui'
import { api } from '@/lib/api'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  readAt: string | null
  createdAt: string
}

const TYPE_ICONS: Record<string, string> = {
  TASK: '✅',
  ALERT: '🔔',
  CLIENT: '👥',
  NEWS: '📰',
  SYSTEM: '⚙️',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [onlyUnread, setOnlyUnread] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ notifications: Notification[]; unreadCount: number }>(
        onlyUnread ? '/notifications?unread=true' : '/notifications'
      )
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [onlyUnread])

  useEffect(() => {
    load()
  }, [load])

  async function markRead(id: string) {
    await api.post(`/notifications/${id}/read`)
    load()
  }

  async function markAll() {
    await api.post('/notifications/read-all')
    load()
  }

  return (
    <Main>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Notificações</h1>
          <p className="text-sm text-gray-500">{unreadCount} não lidas</p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input type="checkbox" checked={onlyUnread} onChange={(e) => setOnlyUnread(e.target.checked)} className="accent-emerald-500" />
            Só não lidas
          </label>
          {unreadCount > 0 && (
            <button onClick={markAll} className="text-xs text-market-accent hover:opacity-80">Marcar todas como lidas</button>
          )}
        </div>
      </header>

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-2 max-w-3xl">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`w-full text-left ${n.readAt ? 'opacity-60' : ''}`}
            >
              <Card>
                <div className="flex items-start gap-3">
                  <span className="text-lg">{TYPE_ICONS[n.type] || '🔔'}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-200">{n.title}</p>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                    <p className="text-xs text-gray-600 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.readAt && <span className="w-2 h-2 mt-1 rounded-full bg-market-accent flex-shrink-0" />}
                </div>
              </Card>
            </button>
          ))}
          {notifications.length === 0 && <p className="text-sm text-gray-500 text-center py-8">Nenhuma notificação.</p>}
        </div>
      )}
    </Main>
  )
}