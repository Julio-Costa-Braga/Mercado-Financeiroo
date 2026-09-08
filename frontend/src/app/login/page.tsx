'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { connectSocket } from '@/lib/socket'
import { useI18n } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

function BrandMark({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30 ${className}`}>
      <svg className="w-1/2 h-1/2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l4-4 4 4 5-6 5 5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18" />
      </svg>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      setError(t('login.error.required'))
      return
    }
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
      setError(err.message || t('login.error.required'))
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

  const inputCls =
    'w-full bg-market-bg/80 border border-market-border rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-market-accent/50 focus:border-market-accent/50 transition-all'

  return (
    <div className="min-h-screen flex bg-market-bg relative overflow-hidden">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-3xl animate-glow" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-3xl animate-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Left panel - brand */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative border-r border-market-border/60 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1424] via-[#0a0e17] to-[#141b2e]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative p-10 animate-fade-in">
          <div className="flex items-center gap-3">
            <BrandMark className="w-11 h-11" />
            <div>
              <p className="text-xl font-bold text-white">{t('app.name')}</p>
              <p className="text-xs text-gray-500">{t('app.tagline')}</p>
            </div>
          </div>
        </div>

        <div className="relative px-10 pb-10 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-white leading-tight mb-4">
            {t('app.subtitle')}
          </h1>

          <div className="space-y-4 mt-8">
            {[
              { title: t('app.feature.1.title'), desc: t('app.feature.1.desc'), icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { title: t('app.feature.2.title'), desc: t('app.feature.2.desc'), icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
              { title: t('app.feature.3.title'), desc: t('app.feature.3.desc'), icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-market-accent/10 border border-market-accent/20 shrink-0">
                  <svg className="w-5 h-5 text-market-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-200">{f.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-center gap-6 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-market-up" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {t('footer.secure')}
            </span>
            <span>© 2026 {t('app.name')}</span>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 lg:hidden">
              <BrandMark className="w-10 h-10" />
              <div>
                <p className="text-lg font-bold text-white">{t('app.name')}</p>
                <p className="text-xs text-gray-500">{t('app.tagline')}</p>
              </div>
            </div>
            <div className="ml-auto">
              <LanguageSwitcher />
            </div>
          </div>

          <div className="bg-market-card/70 backdrop-blur-xl border border-market-border rounded-2xl p-8 shadow-2xl shadow-black/40">
            {!mfaRequired ? (
              <>
                <h2 className="text-2xl font-bold text-white mb-1">{t('login.title')}</h2>
                <p className="text-sm text-gray-500 mb-6">{t('login.subtitle')}</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">{t('login.email')}</label>
                    <div className="relative">
                      <svg className="w-4.5 h-4.5 w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`${inputCls} pl-11`}
                        placeholder={t('login.email.placeholder')}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">{t('login.password')}</label>
                    <div className="relative">
                      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputCls} pl-11 pr-11`}
                        placeholder={t('login.password.placeholder')}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm-3-9c-4.478 0-8.268 2.943-9.543 7 1.275 4.057 5.065 7 9.543 7s8.268-2.943 9.543-7c-1.275-4.057-5.065-7-9.543-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-xs text-market-down bg-market-down/10 border border-market-down/20 rounded-lg px-3 py-2.5">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-market-accent hover:bg-blue-700 active:scale-[0.99] text-white font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        {t('login.submit.loading')}
                      </>
                    ) : (
                      t('login.submit')
                    )}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <a href="/forgot-password" className="text-xs text-gray-500 hover:text-market-accent transition-colors">
                    {t('login.forgot')}
                  </a>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-white mb-1">{t('login.mfa.title')}</h2>
                <p className="text-sm text-gray-500 mb-6">{t('login.mfa.subtitle')}</p>

                <form onSubmit={handleMfa} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">{t('login.mfa.code')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      className={`${inputCls} tracking-widest text-center text-lg`}
                      maxLength={6}
                      required
                      autoFocus
                      placeholder="000000"
                    />
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 text-xs text-market-down bg-market-down/10 border border-market-down/20 rounded-lg px-3 py-2.5">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-market-accent hover:bg-blue-700 active:scale-[0.99] text-white font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        {t('login.mfa.submit.loading')}
                      </>
                    ) : (
                      t('login.mfa.submit')
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-600">
            <span className="text-gray-500">{t('login.demo.caption')}:</span>
            <code className="px-2 py-0.5 bg-market-card border border-market-border rounded-md text-gray-400 font-mono">
              {t('login.demo.creds')}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}