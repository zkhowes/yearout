'use client'

import { useState, useRef } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { updateEventCoverPhoto } from '@/lib/event-actions'

export function CoverPhoto({
  eventId,
  ritualSlug,
  year,
  coverPhotoUrl,
  canEdit,
}: {
  eventId: string
  ritualSlug: string
  year: number
  coverPhotoUrl: string | null
  canEdit: boolean
}) {
  const [photoUrl, setPhotoUrl] = useState(coverPhotoUrl)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Upload failed (${res.status})`)
      }
      const { url } = await res.json()
      setPhotoUrl(url)
      await updateEventCoverPhoto(eventId, ritualSlug, year, url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      console.error('Cover photo upload error:', message)
      setUploadError(message)
    } finally {
      setUploading(false)
    }
  }

  if (photoUrl) {
    return (
      <div className="flex flex-col gap-1">
        <div className="relative rounded-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Event group photo"
            className="w-full aspect-[16/9] object-cover"
          />
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs font-medium hover:bg-black/80 transition-colors flex items-center gap-1.5"
              >
                {uploading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <ImagePlus size={12} />
                )}
                Replace
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
        {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
      </div>
    )
  }

  if (!canEdit) return null

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-2 text-[var(--fg-muted)] hover:border-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors disabled:opacity-50"
    >
      {uploading ? (
        <Loader2 size={24} className="animate-spin" />
      ) : (
        <>
          <ImagePlus size={24} />
          <span className="text-sm">Add a group photo</span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </button>
  )
}
