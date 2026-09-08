'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { connectSocket } from '@/lib/socket'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post<{ accessToken: string; refreshToken?: string; mfaRequired?: boolean }>(
        '/auth/login',
        { email, password }
      )
      if (data.mfaRequired) {
        setMfaRequired(true)
        return
      }
      api.setTokens(data.accessToken, data.refreshToken)
      connectSocket()
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post<{ accessToken: string; refreshToken: string }>(
        '/auth/mfa/verify',
        { email, code: mfaCode }
      )
      api.setTokens(data.accessToken, data.refreshToken)
      connectSocket()
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-market-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Market Now</h1>
          <p className="text-gray-500 text-sm mt-1">Plataforma de Mercado Financeiro</p>
        </div>

        <div className="bg-market-card border border-market-border rounded-lg p-6 shadow-xl">
          {!mfaRequired ? (
            <>
              <h2 className="text-lg font-semibold text-gray-200 mb-4">Entrar</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-market-accent"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-market-accent"
                    required
                  />
                </div>

                {error && <p className="text-xs text-market-down">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-market-accent hover:opacity-90 text-white font-medium py-2 rounded-md text-sm disabled:opacity-50"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <a href="/forgot-password" className="text-xs text-gray-500 hover:text-market-accent">
                  Esqueci minha senha
                </a>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-200 mb-4">Verificação MFA</h2>
              <form onSubmit={handleMfa} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Código</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full bg-market-bg border border-market-border rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-market-accent tracking-widest"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="000000"
                  />
                </div>
                {error && <p className="text-xs text-market-down">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-market-accent hover:opacity-90 text-white font-medium py-2 rounded-md text-sm disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Verificar'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Login demo: admin@mercado.com / admin123
        </p>
      </div>
    </div>
  )
}