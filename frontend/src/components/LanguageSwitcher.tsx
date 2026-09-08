'use client'
import React, { useState } from 'react'
import { useI18n, locales, localeNames } from '@/lib/i18n'

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n()
  const [open, setOpen] = useState(false)

  if (compact) {
    return (
      <div className="flex items-center gap-1 border border-market-border rounded-lg p-0.5">
        {locales.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            title={localeNames[l].native}
            className={`text-[10px] font-semibold px-2 py-1 rounded transition-colors ${
              locale === l ? 'bg-market-accent text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {localeNames[l].label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border border-market-border rounded-lg px-3 py-1.5 text-xs text-gray-300 hover:border-market-border/80 hover:text-white transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18 15 15 0 010-18z" />
        </svg>
        {localeNames[locale].label}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-44 bg-market-card border border-market-border rounded-lg shadow-xl overflow-hidden">
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLocale(l)
                setOpen(false)
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                locale === l ? 'text-market-accent bg-market-accent/10' : 'text-gray-400 hover:bg-market-border hover:text-white'
              }`}
            >
              {localeNames[l].native}
              {locale === l && <span className="float-right">✓</span>}
            </button>
          ))}
        </div>
      )}
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
    </div>
  )
}