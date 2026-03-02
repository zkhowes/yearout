'use client'

import { useState, useTransition, useRef } from 'react'
import { Check, Loader2, Upload } from 'lucide-react'
import { updateProfile } from '@/lib/profile-actions'

type ProfileUser = {
  name: string
  image: string
  nationality: string
}

export function ProfileForm({ user }: { user: ProfileUser }) {
  const [name, setName] = useState(user.name)
  const [image, setImage] = useState(user.image)
  const [nationality, setNationality] = useState(user.nationality)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const { url } = await res.json()
      setImage(url)
    } finally {
      setUploading(false)
    }
  }

  function save() {
    startTransition(async () => {
      await updateProfile({ name, image: image || undefined, nationality })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Photo */}
      <div className="flex flex-col items-center gap-3">
        <label className="text-xs text-[var(--fg-muted)]">Photo</label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-20 h-20 rounded-full border-2 border-dashed border-[var(--border)] hover:border-[var(--fg)] transition-colors overflow-hidden flex items-center justify-center"
        >
          {image ? (
            <img src={image} alt="Profile photo" className="w-full h-full object-cover" />
          ) : (
            <Upload size={20} className="text-[var(--fg-muted)]" />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
              <Loader2 size={20} className="animate-spin text-white" />
            </div>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />
      </div>

      {/* Name */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-[var(--fg-muted)]">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full text-xl font-bold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-[var(--fg)] transition-colors"
        />
      </div>

      {/* Nationality */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-[var(--fg-muted)]">Nationality</label>
        <input
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
          placeholder="e.g. American"
          className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] transition-colors"
        />
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={pending}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-xl btn-accent text-base font-semibold disabled:opacity-50"
      >
        {pending ? (
          <><Loader2 size={16} className="animate-spin" /> Saving...</>
        ) : saved ? (
          <><Check size={16} /> Saved</>
        ) : (
          'Save Changes'
        )}
      </button>
    </div>
  )
}
