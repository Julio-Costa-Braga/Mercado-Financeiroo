import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { I18nProvider } from '@/lib/i18n'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Market Now - Mercado Financeiro',
  description: 'Plataforma de análise de mercado e gestão de clientes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-market-bg text-gray-200 min-h-screen antialiased`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}