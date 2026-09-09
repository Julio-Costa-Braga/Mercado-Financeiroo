'use client'
import React, { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'O que está em alta hoje?',
  'Vale investir em cripto?',
  'Como diversificar minha carteira?',
]

function ChatBubble({ d }: { d: string }) {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

export default function ChatWidget() {
  const { locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content:
        locale === 'en'
          ? 'Hi! Ask me about investments, assets or the market.'
          : locale === 'es'
            ? '¡Hola! Pregúntame sobre inversiones, activos o el mercado.'
            : 'Olá! Pode me perguntar sobre investimentos, ativos ou o mercado.',
    },
  ])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending, open])

  async function sendMessage(text: string) {
    const t = text.trim()
    if (!t || sending) return
    const next = [...messages, { role: 'user' as const, content: t }]
    setMessages(next)
    setDraft('')
    setSending(true)
    setError('')
    try {
      const res = await api.post<{ reply: string; ai: boolean }>('/ai/chat', {
        message: t,
        history: messages.slice(-6),
        locale,
      })
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }])
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar mensagem')
      setMessages((m) => m.slice(0, -1))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-[min(92vw,380px)] rounded-2xl overflow-hidden border border-market-border bg-market-card/95 backdrop-blur-xl shadow-2xl shadow-black/50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-market-accent/15 border-b border-market-border">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-market-accent opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-market-accent" />
              </span>
              <p className="text-sm font-semibold text-gray-100">
                {locale === 'en' ? 'AI Assistant' : locale === 'es' ? 'Asistente IA' : 'Assistente IA'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setOpen(false)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-market-border/60 transition-colors">
                <ChatBubble d="M5 15h14M5 9h14" />
                Minimizar
              </button>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white px-1.5" aria-label="Fechar">
                ✕
              </button>
            </div>
          </div>

          <div className="h-72 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-market-accent/15 border border-market-accent/40 text-gray-100'
                      : 'bg-market-bg border border-market-border text-gray-300'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-market-bg border border-market-border rounded-2xl px-3 py-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-market-accent animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-market-accent animate-pulse [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-market-accent animate-pulse [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-market-bg border border-market-border text-gray-400 hover:text-market-accent hover:border-market-accent/40 transition-all"
              >
                {s}
              </button>
            ))}
          </div>

          {error && <p className="text-[11px] text-market-down px-3 pb-1">{error}</p>}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage(draft)
            }}
            className="p-3 pt-2 border-t border-market-border flex gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={locale === 'en' ? 'Ask anything...' : locale === 'es' ? 'Escribe aquí...' : 'Escreva sua pergunta...'}
              className="flex-1 bg-market-bg border border-market-border rounded-xl px-3 py-2 text-sm text-gray-200 outline-none focus:border-market-accent/50"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="px-3.5 rounded-xl bg-market-accent text-white text-sm font-medium hover:bg-market-accent/90 disabled:opacity-40 transition-colors"
            >
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="group relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center text-white"
        aria-label="Assistente IA"
      >
        <ChatBubble d="M12 3a5 5 0 015 5v1a3 3 0 013 3v4a3 3 0 01-3 3H7a3 3 0 01-3-3v-4a3 3 0 013-3V8a5 5 0 015-5zm-3 12h.01M15 15h.01M9 12h.01M15 12h.01" />
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-market-bg" />
        )}
      </button>
    </div>
  )
}