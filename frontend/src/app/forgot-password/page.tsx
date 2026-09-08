'use client'
import React, { useState } from 'react'
import Link from 'next/link'
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
        <div className="bg-market-card border border-market-border rounded-lg p-6 shadow-xl">
          <h1 className="text-lg font-semibold text-gray-200 mb-2">Recuperar senha</h1>
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-500">
                Informe seu e-mail e enviaremos um link para criar uma nova senha.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm text-gray-200"
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-market-down">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-market-accent hover:opacity-90 text-white font-medium py-2 rounded-md text-sm disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar link'}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-300 mb-2">Link de recuperação enviado!</p>
              <p className="text-xs text-gray-500 mb-4">
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