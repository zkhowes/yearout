'use client'

import { useState, useRef } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { updateEventLogo } from '@/lib/event-actions'

export function EventLogoUpload({
  eventId,
  ritualSlug,
  year,
  eventLogoUrl,
  ritualLogoUrl,
  canEdit,
}: {
  eventId: string
  ritualSlug: string
  year: number
  eventLogoUrl: string | null
  ritualLogoUrl: string | null
  canEdit: boolean
}) {
  const [logoUrl, setLogoUrl] = useState(eventLogoUrl)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayUrl = logoUrl ?? ritualLogoUrl

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Upload failed (${res.status})`)
      }
      const { url } = await res.json()
      setLogoUrl(url)
      await updateEventLogo(eventId, ritualSlug, year, url)
    } catch (err) {
      console.error('Logo upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative">
      <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-[var(--accent)] opacity-80">
        {displayUrl ? (
          <img src={displayUrl} alt="Event logo" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" />
        )}
      </div>
      {canEdit && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--fg)] text-[var(--bg)] flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </>
      )}
    </div>
  )
}
