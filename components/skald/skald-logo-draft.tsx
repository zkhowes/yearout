'use client'

import { useRef, useState } from 'react'
import { Loader2, Upload, RefreshCw, Sparkles } from 'lucide-react'
import type { GenerateLogoResponse } from '@/app/api/ritual/generate-logo/route'

type Theme = 'circuit' | 'club' | 'trail' | 'getaway'

type Props = {
  ritualName: string
  tagline: string | null
  activityLabel: string
  theme: Theme
  logoUrl: string | null
  onLogoChange: (url: string) => void
  context?: string
}

export function SkaldLogoDraft({
  ritualName,
  tagline,
  activityLabel,
  theme,
  logoUrl,
  onLogoChange,
  context,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drafting, setDrafting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function draftLogo() {
    if (drafting) return
    setDrafting(true)
    setError('')
    try {
      const res = await fetch('/api/ritual/generate-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ritualName,
          tagline,
          activityLabel,
          theme,
          context,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Logo generation failed')
      }
      const data: GenerateLogoResponse = await res.json()
      onLogoChange(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logo generation failed')
    } finally {
      setDrafting(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Upload failed')
      }
      const { url } = await res.json()
      onLogoChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const busy = drafting || uploading

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Logo</span>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-[var(--border)] bg-[var(--surface)] flex items-center justify-center shrink-0 overflow-hidden">
          {busy ? (
            <Loader2 size={20} className="animate-spin text-[var(--fg-muted)]" />
          ) : logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <span className="text-2xl select-none opacity-40">⬡</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={draftLogo}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--fg)] text-[var(--bg)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {drafting ? (
              <><Loader2 size={14} className="animate-spin" /> The Skald draws…</>
            ) : logoUrl ? (
              <><RefreshCw size={14} /> Have the Skald redraw</>
            ) : (
              <><Sparkles size={14} /> Have the Skald draft one</>
            )}
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors disabled:opacity-50"
          >
            <Upload size={14} /> Upload your own
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-[var(--fg-muted)]">You can always update this later.</p>
    </div>
  )
}
