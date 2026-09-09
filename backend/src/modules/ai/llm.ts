// M23 - LLM unificado
// IA gratuita por padrao via Groq (llama-3.3-70b-versatile). OpenAI continua
// como opcao se GROQ nao estiver configurada. Sem nenhuma chave, retorna null
// e o sistema opera em modo template (regras + dados reais da plataforma).

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMOpts {
  temperature?: number
  maxTokens?: number
  json?: boolean
}

export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b'
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'

export function llmEnabled(): boolean {
  return !!(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY)
}

export function getActiveModel(): string {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
  return 'template'
}

export async function callLLM(
  messages: LLMMessage[],
  opts: LLMOpts = {},
): Promise<{ output: string; latencyMs: number } | null> {
  const temperature = opts.temperature ?? 0.4
  const maxTokens = opts.maxTokens ?? 900
  const start = Date.now()

  const buildBody = (messages: LLMMessage[]) => {
    const body: any = {
      model: getActiveModel(),
      messages,
      temperature,
      max_tokens: maxTokens,
    }
    if (opts.json) body.response_format = { type: 'json_object' }
    return body
  }

  try {
    if (process.env.GROQ_API_KEY) {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify(buildBody(messages)),
      })
      if (!resp.ok) return null
      const json: any = await resp.json()
      const output = json?.choices?.[0]?.message?.content
      return output ? { output, latencyMs: Date.now() - start } : null
    }

    if (process.env.OPENAI_API_KEY) {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(buildBody(messages)),
      })
      if (!resp.ok) return null
      const json: any = await resp.json()
      const output = json?.choices?.[0]?.message?.content
      return output ? { output, latencyMs: Date.now() - start } : null
    }

    return null
  } catch {
    return null
  }
}