import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        market: {
          bg: '#0a0e17',
          card: '#111827',
          border: '#1f2937',
          up: '#10b981',
          down: '#ef4444',
          accent: '#3b82f6',
        },
      },
    },
  },
  plugins: [],
}

export default config