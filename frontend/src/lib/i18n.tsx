'use client'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Locale = 'pt' | 'en' | 'es'

const pt = {
  'app.name': 'Market Now',
  'app.tagline': 'Plataforma de Mercado Financeiro',
  'app.subtitle': 'Análise de mercado, gestão de clientes e inteligência em um só lugar.',
  'app.feature.1.title': 'Mercado em tempo real',
  'app.feature.1.desc': 'Ações, cripto, forex, ETFs e índices com dados atualizados.',
  'app.feature.2.title': 'Carteira de clientes',
  'app.feature.2.desc': 'Priorização por risco, retenção e metas em painéis claros.',
  'app.feature.3.title': 'Inteligência assistida',
  'app.feature.3.desc': 'IA para research, recomendações e relatórios automáticos.',
  'login.title': 'Entrar',
  'login.subtitle': 'Acesse sua conta para continuar',
  'login.email': 'E-mail',
  'login.password': 'Senha',
  'login.email.placeholder': 'voce@exemplo.com',
  'login.password.placeholder': 'Digite sua senha',
  'login.submit': 'Entrar',
  'login.submit.loading': 'Entrando...',
  'login.forgot': 'Esqueci minha senha',
  'login.demo.caption': 'Login demo',
  'login.demo.creds': 'admin@mercado.com / admin123',
  'login.error.required': 'Preencha todos os campos.',
  'login.mfa.title': 'Verificação em duas etapas',
  'login.mfa.subtitle': 'Digite o código de 6 dígitos',
  'login.mfa.code': 'Código',
  'login.mfa.submit': 'Verificar',
  'login.mfa.submit.loading': 'Verificando...',
  'lang.pt': 'Português',
  'lang.en': 'English',
  'lang.es': 'Español',
  'lang.switch': 'Idioma',
  'footer.rights': 'Todos os direitos reservados.',
  'footer.secure': 'Conexão segura',
  'nav.dashboard': 'Dashboard',
  'nav.markets': 'Mercados',
  'nav.stocks': 'Ações',
  'nav.crypto': 'Crypto',
  'nav.forex': 'Forex',
  'nav.etfs': 'ETFs',
  'nav.indices': 'Índices',
  'nav.research': 'Research',
  'nav.overview': 'Visão geral',
  'nav.sectors': 'Setores',
  'nav.compare': 'Comparador',
  'nav.news': 'Notícias',
  'nav.macro': 'Macroeconomia',
  'nav.calendar': 'Calendário Econ.',
  'nav.clients': 'Clientes',
  'nav.retention': 'Retention',
  'nav.deposits': 'Depósitos',
  'nav.watchlist': 'Watchlist',
  'nav.alerts': 'Alertas',
  'nav.tasks': 'Tarefas',
  'nav.reports': 'KPIs & Relatórios',
  'nav.assistant': 'Assistente IA',
  'nav.notifications': 'Notificações',
  'nav.integrations': 'Integrações',
  'nav.admin': 'Administração',
  'nav.audit': 'Auditoria',
  'nav.health': 'Observabilidade',
  'nav.platform': 'Plataforma de Mercado',
  'nav.logout': 'Sair',
  'dashboard.title': 'Dashboard',
  'dashboard.subtitle': 'Visão geral do mercado e da operação',
  'dashboard.updated': 'Atualizado',
  'dashboard.marketNow': 'Mercado agora',
  'dashboard.topGainers': 'Maiores altas',
  'dashboard.topLosers': 'Maiores quedas',
  'dashboard.sectors': 'Setores',
  'dashboard.clients': 'Clientes prioritários',
  'dashboard.news': 'Notícias',
  'dashboard.tasks': 'Tarefas do dia',
  'dashboard.seeAll': 'Ver todos',
  'dashboard.justNow': 'agora',
  'dashboard.minAgo': 'há {{n}} min',
  'dashboard.hourAgo': 'há {{n}} h',
}

export type Dict = {
  [K in keyof typeof pt]: string
}

const en: Dict = {
  'app.name': 'Market Now',
  'app.tagline': 'Financial Markets Platform',
  'app.subtitle': 'Market analytics, client management and intelligence in one place.',
  'app.feature.1.title': 'Real-time markets',
  'app.feature.1.desc': 'Stocks, crypto, forex, ETFs and indices with updated data.',
  'app.feature.2.title': 'Client portfolio',
  'app.feature.2.desc': 'Risk prioritization, retention and goals on clear dashboards.',
  'app.feature.3.title': 'Assisted intelligence',
  'app.feature.3.desc': 'AI-powered research, recommendations and automated reports.',
  'login.title': 'Sign in',
  'login.subtitle': 'Access your account to continue',
  'login.email': 'Email',
  'login.password': 'Password',
  'login.email.placeholder': 'you@example.com',
  'login.password.placeholder': 'Enter your password',
  'login.submit': 'Sign in',
  'login.submit.loading': 'Signing in...',
  'login.forgot': 'Forgot my password',
  'login.demo.caption': 'Demo login',
  'login.demo.creds': 'admin@mercado.com / admin123',
  'login.error.required': 'Please fill in all fields.',
  'login.mfa.title': 'Two-factor verification',
  'login.mfa.subtitle': 'Enter the 6-digit code',
  'login.mfa.code': 'Code',
  'login.mfa.submit': 'Verify',
  'login.mfa.submit.loading': 'Verifying...',
  'lang.pt': 'Português',
  'lang.en': 'English',
  'lang.es': 'Español',
  'lang.switch': 'Language',
  'footer.rights': 'All rights reserved.',
  'footer.secure': 'Secure connection',
  'nav.dashboard': 'Dashboard',
  'nav.markets': 'Markets',
  'nav.stocks': 'Stocks',
  'nav.crypto': 'Crypto',
  'nav.forex': 'Forex',
  'nav.etfs': 'ETFs',
  'nav.indices': 'Indices',
  'nav.research': 'Research',
  'nav.overview': 'Overview',
  'nav.sectors': 'Sectors',
  'nav.compare': 'Comparator',
  'nav.news': 'News',
  'nav.macro': 'Macroeconomy',
  'nav.calendar': 'Econ. Calendar',
  'nav.clients': 'Clients',
  'nav.retention': 'Retention',
  'nav.deposits': 'Deposits',
  'nav.watchlist': 'Watchlist',
  'nav.alerts': 'Alerts',
  'nav.tasks': 'Tasks',
  'nav.reports': 'KPIs & Reports',
  'nav.assistant': 'AI Assistant',
  'nav.notifications': 'Notifications',
  'nav.integrations': 'Integrations',
  'nav.admin': 'Administration',
  'nav.audit': 'Audit',
  'nav.health': 'Observability',
  'nav.platform': 'Market Platform',
  'nav.logout': 'Log out',
  'dashboard.title': 'Dashboard',
  'dashboard.subtitle': 'Market and operations overview',
  'dashboard.updated': 'Updated',
  'dashboard.marketNow': 'Market now',
  'dashboard.topGainers': 'Top gainers',
  'dashboard.topLosers': 'Top losers',
  'dashboard.sectors': 'Sectors',
  'dashboard.clients': 'Priority clients',
  'dashboard.news': 'News',
  'dashboard.tasks': "Today's tasks",
  'dashboard.seeAll': 'See all',
  'dashboard.justNow': 'now',
  'dashboard.minAgo': '{{n}} min ago',
  'dashboard.hourAgo': '{{n}} h ago',
}

const es: Dict = {
  'app.name': 'Market Now',
  'app.tagline': 'Plataforma de Mercados Financieros',
  'app.subtitle': 'Análisis de mercado, gestión de clientes e inteligencia en un solo lugar.',
  'app.feature.1.title': 'Mercados en tiempo real',
  'app.feature.1.desc': 'Acciones, cripto, forex, ETFs e índices con datos actualizados.',
  'app.feature.2.title': 'Cartera de clientes',
  'app.feature.2.desc': 'Priorización por riesgo, retención y metas en paneles claros.',
  'app.feature.3.title': 'Inteligencia asistida',
  'app.feature.3.desc': 'IA para research, recomendaciones e informes automáticos.',
  'login.title': 'Iniciar sesión',
  'login.subtitle': 'Accede a tu cuenta para continuar',
  'login.email': 'Correo',
  'login.password': 'Contraseña',
  'login.email.placeholder': 'tu@ejemplo.com',
  'login.password.placeholder': 'Ingresa tu contraseña',
  'login.submit': 'Iniciar sesión',
  'login.submit.loading': 'Entrando...',
  'login.forgot': 'Olvidé mi contraseña',
  'login.demo.caption': 'Login demo',
  'login.demo.creds': 'admin@mercado.com / admin123',
  'login.error.required': 'Completa todos los campos.',
  'login.mfa.title': 'Verificación en dos pasos',
  'login.mfa.subtitle': 'Ingresa el código de 6 dígitos',
  'login.mfa.code': 'Código',
  'login.mfa.submit': 'Verificar',
  'login.mfa.submit.loading': 'Verificando...',
  'lang.pt': 'Português',
  'lang.en': 'English',
  'lang.es': 'Español',
  'lang.switch': 'Idioma',
  'footer.rights': 'Todos los derechos reservados.',
  'footer.secure': 'Conexión segura',
  'nav.dashboard': 'Panel',
  'nav.markets': 'Mercados',
  'nav.stocks': 'Acciones',
  'nav.crypto': 'Crypto',
  'nav.forex': 'Forex',
  'nav.etfs': 'ETFs',
  'nav.indices': 'Índices',
  'nav.research': 'Research',
  'nav.overview': 'Resumen',
  'nav.sectors': 'Sectores',
  'nav.compare': 'Comparador',
  'nav.news': 'Noticias',
  'nav.macro': 'Macroeconomía',
  'nav.calendar': 'Cal. Econ.',
  'nav.clients': 'Clientes',
  'nav.retention': 'Retención',
  'nav.deposits': 'Depósitos',
  'nav.watchlist': 'Watchlist',
  'nav.alerts': 'Alertas',
  'nav.tasks': 'Tareas',
  'nav.reports': 'KPIs e Informes',
  'nav.assistant': 'Asistente IA',
  'nav.notifications': 'Notificaciones',
  'nav.integrations': 'Integraciones',
  'nav.admin': 'Administración',
  'nav.audit': 'Auditoría',
  'nav.health': 'Observabilidad',
  'nav.platform': 'Plataforma de Mercados',
  'nav.logout': 'Salir',
  'dashboard.title': 'Panel',
  'dashboard.subtitle': 'Resumen del mercado y la operación',
  'dashboard.updated': 'Actualizado',
  'dashboard.marketNow': 'Mercado ahora',
  'dashboard.topGainers': 'Mayores subidas',
  'dashboard.topLosers': 'Mayores caídas',
  'dashboard.sectors': 'Sectores',
  'dashboard.clients': 'Clientes prioritarios',
  'dashboard.news': 'Noticias',
  'dashboard.tasks': 'Tareas del día',
  'dashboard.seeAll': 'Ver todos',
  'dashboard.justNow': 'ahora',
  'dashboard.minAgo': 'hace {{n}} min',
  'dashboard.hourAgo': 'hace {{n}} h',
}

const dictionaries: Record<Locale, Dict> = { pt, en, es }
export const locales: Locale[] = ['pt', 'en', 'es']
export const localeNames: Record<Locale, { native: string; label: string }> = {
  pt: { native: 'Português', label: 'PT' },
  en: { native: 'English', label: 'EN' },
  es: { native: 'Español', label: 'ES' },
}

const STORAGE_KEY = 'marketnow.locale'

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'pt'
  const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
  if (saved && saved in dictionaries) return saved
  const nav = navigator.language?.slice(0, 2).toLowerCase()
  return (nav === 'en' || nav === 'es' || nav === 'pt' ? nav : 'pt') as Locale
}

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: keyof Dict, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'pt',
  setLocale: () => {},
  t: (k) => pt[k],
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('pt')

  useEffect(() => {
    setLocaleState(detectLocale())
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
    document.documentElement.lang = l
  }, [])

  const t = useCallback(
    (key: keyof Dict, vars?: Record<string, string | number>) => {
      let str = dictionaries[locale][key] ?? pt[key]
      if (vars && str) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{{${k}}}`, String(v))
        }
      }
      return str
    },
    [locale]
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}