// Embeddings para o RAG.
// Prioridade: Gemini (grátis) via GEMINI_API_KEY; fallback OpenAI via OPENAI_API_KEY.
// Sem chave configurada, o RAG opera em modo keyword (ILIKE) — a busca ainda
// funciona, apenas sem relevância semântica. Dimensão fixa 768 (text-embedding-004).

export const EMBEDDING_DIM = 768

let lastError: string | null = null

export function embeddingLastError(): string | null {
  return lastError
}

export function embeddingEnabled(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)
}

export function embeddingProvider(): string {
  if (process.env.GEMINI_API_KEY) return 'gemini'
  if (process.env.OPENAI_API_KEY) return 'openai'
  return 'keyword'
}

export async function embedText(text: string): Promise<number[] | null> {
  const input = String(text).slice(0, 8000)
  try {
    if (process.env.GEMINI_API_KEY) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text: input }] },
          }),
        }
      )
      if (!resp.ok) {
        lastError = `gemini HTTP ${resp.status}: ${String(await resp.text()).slice(0, 200)}`
        return null
      }
      const json: any = await resp.json()
      const values = json?.embedding?.values
      const ok = Array.isArray(values) && values.length
      lastError = ok ? null : 'gemini retornou resposta sem embedding.values'
      return ok ? values : null
    }

    if (process.env.OPENAI_API_KEY) {
      const resp = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input,
          dimensions: EMBEDDING_DIM,
        }),
      })
      if (!resp.ok) {
        lastError = `openai HTTP ${resp.status}: ${String(await resp.text()).slice(0, 200)}`
        return null
      }
      const json: any = await resp.json()
      const values = json?.data?.[0]?.embedding
      lastError = Array.isArray(values) && values.length ? null : 'openai retornou resposta sem embedding'
      return Array.isArray(values) && values.length ? values : null
    }

    lastError = 'nenhuma chave de embedding configurada'
    return null
  } catch (err: any) {
    lastError = `embedding falhou: ${err?.message || String(err)}`
    return null
  }
}

export function vectorLiteral(embedding: number[]): string {
  return `[${embedding.map((n) => String(n)).join(',')}]`
}