'use client'

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from 'lucide-react'
import { updateRitualHeroPhotos } from '@/lib/ritual-actions'
import { compressImage } from '@/lib/compress-image'

export function HeroCarousel({
  ritualId,
  ritualSlug,
  initialPhotos,
  canEdit,
}: {
  ritualId: string
  ritualSlug: string
  initialPhotos: string[]
  canEdit: boolean
}) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos)
  const [current, setCurrent] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [saving, startSave] = useTransition()
  const [showManage, setShowManage] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (photos.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrent((c) => (c + 1) % photos.length)
      }, 10000)
    }
  }, [photos.length])

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [startTimer])

  function go(dir: -1 | 1) {
    setCurrent((c) => (c + dir + photos.length) % photos.length)
    startTimer()
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of files) {
        const compressed = await compressImage(file)
        const formData = new FormData()
        formData.append('file', compressed)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (res.ok) {
          const { url } = await res.json()
          urls.push(url)
        }
      }
      if (urls.length > 0) {
        const updated = [...photos, ...urls]
        setPhotos(updated)
        setCurrent(updated.length - urls.length) // show first new photo
        startSave(async () => {
          await updateRitualHeroPhotos(ritualId, ritualSlug, updated)
        })
      }
    } catch (err) {
      console.error('Hero photo upload error:', err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleRemove(index: number) {
    const updated = photos.filter((_, i) => i !== index)
    setPhotos(updated)
    if (current >= updated.length) setCurrent(Math.max(0, updated.length - 1))
    startSave(async () => {
      await updateRitualHeroPhotos(ritualId, ritualSlug, updated)
    })
  }

  // No photos — show upload placeholder for sponsors
  if (photos.length === 0) {
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
            <span className="text-sm">Add hero photos</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Carousel */}
      <div className="relative rounded-xl overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[current]}
          alt={`Hero photo ${current + 1}`}
          className="w-full aspect-[16/9] object-cover transition-opacity duration-500"
        />

        {/* Nav arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
              aria-label="Previous photo"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
              aria-label="Next photo"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Dots */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); startTimer() }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === current ? 'bg-white' : 'bg-white/40'
                }`}
                aria-label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Sponsor controls overlay */}
        {canEdit && (
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-2 rounded-lg bg-black/60 text-white text-xs font-medium hover:bg-black/80 transition-colors flex items-center gap-1.5"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={16} />}
              Add
            </button>
            <button
              onClick={() => setShowManage(!showManage)}
              className="px-3 py-2 rounded-lg bg-black/60 text-white text-xs font-medium hover:bg-black/80 transition-colors"
            >
              {showManage ? 'Done' : 'Manage'}
            </button>
          </div>
        )}
      </div>

      {/* Manage thumbnails strip */}
      {canEdit && showManage && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            <div key={i} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Thumbnail ${i + 1}`}
                className={`w-16 h-12 rounded-lg object-cover border-2 cursor-pointer ${
                  i === current ? 'border-[var(--accent)]' : 'border-transparent'
                }`}
                onClick={() => { setCurrent(i); startTimer() }}
              />
              <button
                onClick={() => handleRemove(i)}
                disabled={saving}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  )
}
