import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Market Now - Mercado Financeiro',
  description: 'Plataforma de análise de mercado e gestão de clientes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body className="bg-market-bg text-gray-200 min-h-screen">{children}</body>
    </html>
  )
}