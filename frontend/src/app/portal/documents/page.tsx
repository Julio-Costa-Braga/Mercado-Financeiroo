'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Main } from '@/components/layout'
import { Card, PageHeader, Spinner, EmptyState, Button, formatDate } from '@/components/ui'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

interface Doc {
  id: string
  name: string
  category: string
  mimeType: string
  size: number
  createdAt: string
}

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return bytes + ' B'
}

function getDownloadUrl(docId: string) {
  return `${api.getBaseUrl()}/portal/documents/${docId}/download`
}

export default function PortalDocumentsPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const d = await api.get<{ documents: Doc[] }>('/portal/documents')
      setDocs(d.documents)
      setError('')
    } catch (err: any) {
      if (err.message === 'Não autorizado' || err.status === 401) {
        router.push('/login')
        return
      }
      setError(err.message || 'Erro ao carregar documentos')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage('')
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.postForm('/portal/documents', fd)
      setMessage(t('portal.documents.uploaded'))
      if (fileRef.current) fileRef.current.value = ''
      load()
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar documento')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('portal.documents.confirm'))) return
    try {
      await api.del(`/portal/documents/${id}`)
      setDocs((d) => d.filter((x) => x.id !== id))
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir documento')
    }
  }

  if (loading) return <Main><Spinner /></Main>

  return (
    <Main>
      <PageHeader
        title={t('portal.documents.title')}
        subtitle={t('portal.documents.subtitle')}
        actions={
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
        }
      />

      <Card
        title={t('portal.documents.title')}
        action={
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? t('portal.documents.uploading') : t('portal.documents.upload')}
          </Button>
        }
      >
        {message && (
          <div className="mb-4 text-xs text-market-up bg-market-up/10 border border-market-up/20 rounded-lg px-3 py-2.5">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 text-xs text-market-down bg-market-down/10 border border-market-down/20 rounded-lg px-3 py-2.5">
            {error}
          </div>
        )}

        {docs.length === 0 ? (
          <EmptyState title={t('portal.noDocuments')} description={t('portal.noDocumentsDesc')} />
        ) : (
          <ul className="divide-y divide-market-border/60">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{doc.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {doc.category} · {fmtSize(doc.size)} · {formatDate(doc.createdAt)}
                  </p>
                </div>
                <a
                  href={getDownloadUrl(doc.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-market-accent hover:underline shrink-0"
                >
                  {t('portal.documents.download')}
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-xs text-market-down hover:underline shrink-0"
                >
                  {t('portal.documents.delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-6">
        <Button variant="ghost" onClick={() => router.push('/portal')}>
          ← {t('portal.back')}
        </Button>
      </div>
    </Main>
  )
}