'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { createRitual } from '@/lib/ritual-actions'
import { SkaldSpeaks } from '@/components/skald/skald-speaks'
import { ConfirmScreen } from '@/components/new-ritual/confirm-screen'
import { DoneScreen } from '@/components/new-ritual/done-screen'
import { SKALD_LOADERS } from '@/lib/skald/voice'
import type { RitualInference } from '@/app/api/ritual/infer/route'

type Stage = 'input' | 'inferring' | 'confirm' | 'creating' | 'done'

export default function NewRitualNamedPage() {
  const [stage, setStage] = useState<Stage>('input')
  const [name, setName] = useState('')
  const [inference, setInference] = useState<RitualInference | null>(null)
  const [editingTagline, setEditingTagline] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState('')
  const [createdSlug, setCreatedSlug] = useState('')
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Infer on name change (debounced)
  useEffect(() => {
    if (stage !== 'input' && stage !== 'inferring') return
    if (name.trim().length < 3) { setInference(null); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setStage('inferring')
      setError('')
      try {
        const res = await fetch('/api/ritual/infer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        })
        if (!res.ok) throw new Error('Inference failed')
        const data: RitualInference = await res.json()
        setInference(data)
        setStage('confirm')
      } catch {
        setStage('input')
        setError('Could not draft suggestions. Try again.')
      }
    }, 600)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  async function handleCreate() {
    if (!inference) return
    setStage('creating')
    try {
      const { slug, inviteToken } = await createRitual(inference, name.trim())
      const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
      setInviteLink(`${base}/join/${inviteToken}`)
      setCreatedSlug(slug)
      setStage('done')
    } catch {
      setStage('confirm')
      setError('Something went wrong. Try again.')
    }
  }

  if (stage === 'done') {
    return (
      <DoneScreen
        ritualName={name}
        ritualSlug={createdSlug || inference?.slug || ''}
        inviteLink={inviteLink}
      />
    )
  }

  return (
    <div
      className="max-w-2xl mx-auto px-4 min-h-[70vh] flex flex-col justify-center gap-10 py-8"
      style={{ paddingTop: 'calc(var(--header-height) + 24px)' }}
    >
      <SkaldSpeaks tone="brief">
        Name it. I will draft the rest.
      </SkaldSpeaks>

      {/* Name input */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
          What do you call it?
        </label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setStage('input') }}
          placeholder="The Powder Circuit"
          className="w-full text-3xl font-bold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-2 text-[var(--fg)] placeholder-[var(--fg-muted)] transition-colors"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Inferring */}
      <AnimatePresence>
        {stage === 'inferring' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-[var(--fg-muted)]"
          >
            <Loader2 size={14} className="animate-spin" />
            {SKALD_LOADERS.readingRunes}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm section */}
      <AnimatePresence>
        {stage === 'confirm' && inference && (
          <ConfirmScreen
            name={name}
            inference={inference}
            setInference={setInference}
            editingTagline={editingTagline}
            setEditingTagline={setEditingTagline}
            logoPreview={logoPreview}
            setLogoPreview={setLogoPreview}
            creating={false}
            onCreate={handleCreate}
          />
        )}
        {stage === 'creating' && inference && (
          <ConfirmScreen
            name={name}
            inference={inference}
            setInference={setInference}
            editingTagline={editingTagline}
            setEditingTagline={setEditingTagline}
            logoPreview={logoPreview}
            setLogoPreview={setLogoPreview}
            creating={true}
            onCreate={handleCreate}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
