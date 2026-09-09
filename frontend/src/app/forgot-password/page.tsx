'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { Button, inputCls } from '@/components/ui'
import { api } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-market-bg">
      <div className="w-full max-w-md">
        <div className="bg-market-card/60 backdrop-blur-sm border border-market-border rounded-2xl p-6 shadow-lg shadow-black/10">
          <h1 className="text-xl font-bold text-white mb-1">Recuperar senha</h1>
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-500">
                Informe seu e-mail e enviaremos um link para criar uma nova senha.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-market-down">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Enviando...' : 'Enviar link'}
              </Button>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="text-3xl mb-3 opacity-60">📧</div>
              <p className="text-sm font-medium text-gray-200 mb-2">Link de recuperação enviado!</p>
              <p className="text-xs text-gray-500">
                Se houver uma conta com {email}, você receberá um link por e-mail.
              </p>
            </div>
          )}
          <div className="mt-4 text-center">
            <Link href="/login" className="text-xs text-gray-500 hover:text-market-accent">Voltar ao login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}