'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Button, StatusBadge, inputCls, selectCls } from '@/components/ui'
import { api } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

export interface FullClient {
  id: string
  name: string
  email: string | null
  phone: string | null
  country: string | null
  status: string
  retentionStage: string | null
  riskProfile: string | null
  clientType: string | null
  objective: string | null
  experience: string | null
  churnRisk: number
  priorityScore: number
  lastContactAt: string | null
  createdAt: string
  updatedAt: string
  owner: { id: string; name: string } | null
  interests: Array<{ interest: string; weight: number }>
  contacts: Array<{ id: string; type: string; notes: string | null; contactAt: string; user: { name: string } }>
  notes: Array<{ id: string; content: string; createdAt: string; author: { name: string } }>
  retentionHistory: Array<{ id: string; from: string | null; to: string; reason: string | null; createdAt: string }>
}

const STAGES = ['TICKET', 'CONTACTED', 'RECOVERY', 'RECOVERED', 'CHURNED'] as const
const STATUSES = ['ACTIVE', 'INACTIVE', 'PWM', 'AT_RISK', 'CHURNED'] as const
const RISK_PROFILES = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'] as const
const CLIENT_TYPES = ['BEGINNER', 'ENTHUSIAST', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL'] as const
const CONTACT_TYPES = ['call', 'email', 'whatsapp', 'meeting'] as const

const stageToKey = (s: string) =>
  ({
    TICKET: 'retention.columns.ticket',
    CONTACTED: 'retention.columns.contacted',
    RECOVERY: 'retention.columns.recovery',
    RECOVERED: 'retention.columns.recovered',
    CHURNED: 'retention.columns.churned',
  })[s] || s

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

export default function ClientEditModal({
  clientId,
  onClose,
  onChanged,
}: {
  clientId: string | null
  onClose: () => void
  onChanged: () => void
}) {
  const { t } = useI18n()
  const [client, setClient] = useState<FullClient | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [interest, setInterest] = useState('')
  const [note, setNote] = useState('')
  const [contactType, setContactType] = useState<string>('call')
  const [contactNotes, setContactNotes] = useState('')
  const [extraTab, setExtraTab] = useState<'contacts' | 'history'>('contacts')

  const form = {
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    country: client?.country || '',
    status: client?.status || 'ACTIVE',
    retentionStage: client?.retentionStage || '',
    riskProfile: client?.riskProfile || '',
    clientType: client?.clientType || '',
    objective: client?.objective || '',
    experience: client?.experience || '',
  }
  const setForm = (k: keyof typeof form, v: string) => {
    setClient((c) => (c ? { ...c, [k]: v } : c))
  }

  const load = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const data = await api.get<{ client: FullClient }>(`/clients/${clientId}`)
      setClient(data.client)
      setMsg('')
    } catch (err: any) {
      setMsg(err.message || 'Erro ao carregar cliente')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    if (clientId) load()
  }, [clientId, load])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!clientId) return null

  async function saveDetails() {
    if (!clientId) return
    setSaving(true)
    setMsg('')
    const payload: Record<string, any> = {}
    if (form.name.trim()) payload.name = form.name.trim()
    payload.email = form.email.trim() || null
    payload.phone = form.phone.trim() || null
    payload.country = form.country.trim() || null
    payload.status = form.status
    payload.retentionStage = form.retentionStage || null
    payload.riskProfile = form.riskProfile || null
    payload.clientType = form.clientType || null
    payload.objective = form.objective.trim() || null
    payload.experience = form.experience.trim() || null
    try {
      await api.put(`/clients/${clientId}`, payload)
      setMsg(t('clientModal.saved'))
      await load()
      onChanged()
    } catch (err: any) {
      setMsg(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function addInterest(e?: React.FormEvent) {
    e?.preventDefault()
    if (!clientId || !interest.trim()) return
    try {
      await api.post(`/clients/${clientId}/interests`, { interest: interest.trim() })
      setInterest('')
      await load()
      onChanged()
    } catch (err: any) {
      setMsg(err.message || 'Erro ao adicionar interesse')
    }
  }

  async function removeInterest(it: string) {
    if (!clientId) return
    try {
      await api.request(`/clients/${clientId}/interests`, {
        method: 'DELETE',
        body: JSON.stringify({ interest: it }),
      })
      await load()
      onChanged()
    } catch (err: any) {
      setMsg(err.message || 'Erro ao remover interesse')
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !note.trim()) return
    try {
      await api.post(`/clients/${clientId}/notes`, { content: note.trim() })
      setNote('')
      setExtraTab('contacts')
      await load()
      onChanged()
    } catch (err: any) {
      setMsg(err.message || 'Erro ao adicionar nota')
    }
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    try {
      await api.post(`/clients/${clientId}/contacts`, {
        type: contactType,
        notes: contactNotes.trim(),
        via: 'manual',
      })
      setContactNotes('')
      setExtraTab('contacts')
      await load()
      onChanged()
    } catch (err: any) {
      setMsg(err.message || 'Erro ao registrar contato')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4 sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl border border-market-border bg-market-card my-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-market-border">
          <div className="flex items-center gap-3 min-w-0">
            {loading || !client ? (
              <div className="h-5 w-40 bg-market-border/50 animate-pulse rounded" />
            ) : (
              <>
                <h2 className="text-base font-bold text-white truncate">{client.name}</h2>
                <StatusBadge status={client.status} />
                {client.retentionStage && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-market-accent/10 text-market-accent border border-market-accent/20 shrink-0">
                    {t(stageToKey(client.retentionStage) as any)}
                  </span>
                )}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1"
            aria-label={t('clientModal.close')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {msg && (
          <div
            className={`mx-5 mt-4 px-4 py-2.5 rounded-xl text-xs border ${
              msg === t('clientModal.saved')
                ? 'bg-market-up/10 text-market-up border-market-up/20'
                : 'bg-market-down/10 text-market-down border-market-down/20'
            }`}
          >
            {msg}
          </div>
        )}

        <div className="px-5 py-5 space-y-6">
          {/* Dados cadastrados */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t('clientModal.details')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('clientModal.name')}>
                <input className={inputCls} value={form.name} onChange={(e) => setForm('name', e.target.value)} placeholder="Nome" />
              </Field>
              <Field label={t('clientModal.email')}>
                <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm('email', e.target.value)} placeholder="email@exemplo.com" />
              </Field>
              <Field label={t('clientModal.phone')}>
                <input className={inputCls} value={form.phone} onChange={(e) => setForm('phone', e.target.value)} placeholder="+351 900 000 000" />
              </Field>
              <Field label={t('clientModal.country')}>
                <input className={inputCls} value={form.country} onChange={(e) => setForm('country', e.target.value)} placeholder="País" />
              </Field>
              <Field label={t('clientModal.status')}>
                <select className={selectCls} value={form.status} onChange={(e) => setForm('status', e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('clientModal.stage')}>
                <select className={selectCls} value={form.retentionStage} onChange={(e) => setForm('retentionStage', e.target.value)}>
                  <option value="">—</option>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{t(stageToKey(s) as any)}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('clientModal.risk')}>
                <select className={selectCls} value={form.riskProfile} onChange={(e) => setForm('riskProfile', e.target.value)}>
                  <option value="">—</option>
                  {RISK_PROFILES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('clientModal.type')}>
                <select className={selectCls} value={form.clientType} onChange={(e) => setForm('clientType', e.target.value)}>
                  <option value="">—</option>
                  {CLIENT_TYPES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label={t('clientModal.objective')}>
                  <input className={inputCls} value={form.objective} onChange={(e) => setForm('objective', e.target.value)} placeholder="Ex.: preservar capital e gerar renda" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label={t('clientModal.experience')}>
                  <textarea className={inputCls} rows={2} value={form.experience} onChange={(e) => setForm('experience', e.target.value)} placeholder="Experiência e observações de perfil" />
                </Field>
              </div>
            </div>
          </section>

          {/* Interesses */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{t('clientModal.interests')}</h3>
            <form onSubmit={addInterest} className="flex flex-wrap items-center gap-2">
              {client?.interests?.map((i) => (
                <span key={i.interest} className="inline-flex items-center gap-1.5 text-xs bg-market-accent/10 text-market-accent border border-market-accent/25 px-2.5 py-1 rounded-lg">
                  {i.interest}
                  <button type="button" onClick={() => removeInterest(i.interest)} className="text-market-accent/60 hover:text-market-down" aria-label="Remover">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                className={`${inputCls} flex-1 min-w-[140px]`}
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                placeholder={t('clientModal.interestPh')}
              />
              <Button type="submit" size="sm">{t('clientModal.addInterest')}</Button>
            </form>
          </section>

          {/* Inserções */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('clientModal.insert')}</h3>
            </div>
            <div className="flex gap-1.5 mb-3">
              <button
                onClick={() => setExtraTab('contacts')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${extraTab === 'contacts' ? 'bg-market-accent/10 text-market-accent border-market-accent/30' : 'text-gray-400 border-market-border hover:text-gray-200'}`}
              >
                {t('clientModal.contact')}
              </button>
              <button
                onClick={() => setExtraTab('history')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${extraTab === 'history' ? 'bg-market-accent/10 text-market-accent border-market-accent/30' : 'text-gray-400 border-market-border hover:text-gray-200'}`}
              >
                {t('clientModal.history')}
              </button>
            </div>

            {extraTab === 'contacts' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <form onSubmit={addContact} className="space-y-2 border border-market-border rounded-xl p-3">
                  <span className="text-xs font-medium text-gray-400">{t('clientModal.contact')}</span>
                  <select
                    className={selectCls}
                    value={contactType}
                    onChange={(e) => setContactType(e.target.value)}
                  >
                    {CONTACT_TYPES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={contactNotes}
                    onChange={(e) => setContactNotes(e.target.value)}
                    placeholder={t('clientModal.contactNotes')}
                  />
                  <Button type="submit" size="sm" variant="outline">{t('clientModal.addContact')}</Button>
                </form>
                <form onSubmit={addNote} className="space-y-2 border border-market-border rounded-xl p-3">
                  <span className="text-xs font-medium text-gray-400">{t('clientModal.note')}</span>
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t('clientModal.notePh')}
                  />
                  <Button type="submit" size="sm" variant="outline">{t('clientModal.addNote')}</Button>
                </form>
              </div>
            )}

            {extraTab === 'history' && (
              <div className="space-y-2">
                {client?.retentionHistory?.length ? (
                  client.retentionHistory.slice(0, 8).map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-3 text-xs bg-market-bg border border-market-border rounded-lg px-3 py-2">
                      <span className="text-gray-300 font-medium">
                        {h.from ? t(stageToKey(h.from) as any) : '—'} → {t(stageToKey(h.to) as any)}
                      </span>
                      <span className="text-gray-500 shrink-0">{new Date(h.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-600">{t('retention.dropHere')}</p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-market-border">
          <span className="text-[11px] text-gray-500">
            {client && `${t('clientModal.owner')}: ${client.owner?.name || '—'}`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>{t('clientModal.cancel')}</Button>
            <Button onClick={saveDetails} disabled={saving || !client}>
              {saving ? t('clientModal.saving') : t('clientModal.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}