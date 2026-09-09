// Traducao das noticias para pt-BR usando IA gratuita (Groq / OpenAI).
// Traduz em lote (uma chamada por feed) e mantem cache em memoria por noticia.
// Sem chave de IA configurada, retorna o texto original.

import { callLLM, llmEnabled } from '../ai/llm'
import { logger } from '../../config/logger'

// cache: lang -> newsId -> { title, excerpt }
const cache = new Map<string, Map<string, { title: string; excerpt: string | null }>>()

interface NewsItem {
  id: string
  title: string
  excerpt: string | null
}

export async function translateNews(
  lang: string,
  news: NewsItem[],
): Promise<Map<string, { title: string; excerpt: string | null }>> {
  const result = new Map<string, { title: string; excerpt: string | null }>()
  if (lang === 'en' || !llmEnabled() || news.length === 0) return result

  let bucket = cache.get(lang)
  if (!bucket) {
    bucket = new Map()
    cache.set(lang, bucket)
  }

  const missing = news.filter((n) => !bucket!.has(n.id))
  if (missing.length > 0) {
    const payload: Record<string, { title: string; excerpt: string | null }> = {}
    missing.forEach((n) => {
      payload[n.id] = { title: n.title, excerpt: n.excerpt }
    })

    const prompt = `Traduza as noticias financeiras para portugues do Brasil (pt-BR).
Regras:
- Mantenha tickers, simbolos, numeros, percentuais e nomes proprios de empresas/govs sem traducao.
- Excerpt pode ser null; nesse caso retorne null tambem.
- Responda APENAS com JSON neste formato exato (sem markdown):
{"<id>":{"title":"...","excerpt":"..."}, ...}
Noticias:
${JSON.stringify(payload)}`

    try {
      const res = await callLLM(
        [
          { role: 'system', content: 'Voce e um tradutor profissional EN->pt-BR de noticias de mercado financeiro. Responde somente JSON valido.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.1, maxTokens: 2500, json: true },
      )
      if (res) {
        const parsed = JSON.parse(res.output)
        Object.keys(parsed).forEach((id) => {
          const t = parsed[id]
          if (t && typeof t.title === 'string') {
            bucket!.set(id, {
              title: t.title,
              excerpt: typeof t.excerpt === 'string' ? t.excerpt : null,
            })
          }
        })
      }
    } catch (err: any) {
      logger.warn(`[news] traducao falhou (${missing.length} itens): ${err.message}`)
    }
  }

  news.forEach((n) => {
    const t = bucket!.get(n.id)
    result.set(n.id, t || { title: n.title, excerpt: n.excerpt })
  })

  return result
}

export function newsTranslated(news: NewsItem[], translations: Map<string, { title: string; excerpt: string | null }>) {
  return news.map((n) => {
    const t = translations.get(n.id)
    return t ? { ...n, title: t.title, excerpt: t.excerpt } : n
  })
}