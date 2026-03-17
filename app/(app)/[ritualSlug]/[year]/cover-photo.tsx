'use client'

import { useState, useRef } from 'react'
import { ImagePlus, Loader2, Images, X } from 'lucide-react'
import { updateEventCoverPhoto } from '@/lib/event-actions'
import { compressImage } from '@/lib/compress-image'

type LoreImage = { id: string; mediaUrl: string }

export function CoverPhoto({
  eventId,
  ritualSlug,
  year,
  coverPhotoUrl,
  canEdit,
  loreImages = [],
}: {
  eventId: string
  ritualSlug: string
  year: number
  coverPhotoUrl: string | null
  canEdit: boolean
  loreImages?: LoreImage[]
}) {
  const [photoUrl, setPhotoUrl] = useState(coverPhotoUrl)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('file', compressed)
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

  async function handleSelectLore(img: LoreImage) {
    setSelecting(img.id)
    setUploadError('')
    try {
      setPhotoUrl(img.mediaUrl)
      await updateEventCoverPhoto(eventId, ritualSlug, year, img.mediaUrl)
      setShowPicker(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set photo'
      setUploadError(message)
    } finally {
      setSelecting(null)
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
            <div className="absolute bottom-3 right-3 flex gap-2">
              {loreImages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="px-3 py-2 rounded-lg bg-black/60 text-white text-xs font-medium hover:bg-black/80 transition-colors flex items-center gap-1.5"
                >
                  <Images size={16} />
                  From lore
                </button>
              )}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="px-3 py-2 rounded-lg bg-black/60 text-white text-xs font-medium hover:bg-black/80 transition-colors flex items-center gap-1.5"
              >
                {uploading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <ImagePlus size={16} />
                )}
                Upload
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
              />
            </div>
          )}
        </div>
        {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
        {showPicker && (
          <LoreImagePicker
            images={loreImages}
            selecting={selecting}
            onSelect={handleSelectLore}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    )
  }

  if (!canEdit) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex-1 aspect-[16/9] rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-2 text-[var(--fg-muted)] hover:border-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <>
              <ImagePlus size={24} />
              <span className="text-sm">Upload group photo</span>
            </>
          )}
        </button>
      </div>
      {loreImages.length > 0 && (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="self-start text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors flex items-center gap-1.5"
        >
          <Images size={14} />
          Or select from lore photos
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
      {showPicker && (
        <LoreImagePicker
          images={loreImages}
          selecting={selecting}
          onSelect={handleSelectLore}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

function LoreImagePicker({
  images,
  selecting,
  onSelect,
  onClose,
}: {
  images: LoreImage[]
  selecting: string | null
  onSelect: (img: LoreImage) => void
  onClose: () => void
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--fg)]">Select from lore</p>
        <button type="button" onClick={onClose} className="text-[var(--fg-muted)] hover:text-[var(--fg)]">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
        {images.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => onSelect(img)}
            disabled={selecting !== null}
            className="relative rounded-lg overflow-hidden aspect-square hover:ring-2 hover:ring-[var(--accent)] transition-all disabled:opacity-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.mediaUrl} alt="" className="w-full h-full object-cover" />
            {selecting === img.id && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
