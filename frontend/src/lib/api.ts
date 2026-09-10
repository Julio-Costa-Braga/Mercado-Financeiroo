const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const api = {
  baseUrl: API_URL + '/api/v1',

  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('accessToken')
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('refreshToken')
  },

  setTokens(access: string, refresh?: string) {
    localStorage.setItem('accessToken', access)
    if (refresh) localStorage.setItem('refreshToken', refresh)
  },

  clearTokens() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  },

  async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    const token = this.getToken()
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    })

    if (res.status === 401) {
      // Try to refresh once
      const refreshToken = this.getRefreshToken()
      if (refreshToken) {
        try {
          const refreshed = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          })
          if (refreshed.ok) {
            const data = await refreshed.json()
            this.setTokens(data.accessToken)
            return this.request(path, options)
          }
        } catch {
          // ignore
        }
      }
      this.clearTokens()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('Não autorizado')
    }

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error?.message || `Erro ${res.status}`)
    }

    return res.json()
  },

  get<T = any>(path: string) {
    return this.request<T>(path)
  },

  post<T = any>(path: string, body?: any) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  put<T = any>(path: string, body?: any) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  del<T = any>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  },

  getBaseUrl(): string {
    return this.baseUrl
  },

  async postForm<T = any>(path: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {}
    const token = this.getToken()
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (res.status === 401) {
      const refreshToken = this.getRefreshToken()
      if (refreshToken) {
        try {
          const refreshed = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          })
          if (refreshed.ok) {
            const data = await refreshed.json()
            this.setTokens(data.accessToken)
            return this.postForm<T>(path, formData)
          }
        } catch {}
      }
      this.clearTokens()
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Não autorizado')
    }

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error?.message || `Error ${res.status}`)
    }

    return res.json()
  },
}