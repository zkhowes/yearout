'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, ArrowRight, Send } from 'lucide-react'
import { createRitual } from '@/lib/ritual-actions'
import { SkaldSpeaks } from '@/components/skald/skald-speaks'
import { ConfirmScreen } from '@/components/new-ritual/confirm-screen'
import { DoneScreen } from '@/components/new-ritual/done-screen'
import { Rune } from '@/components/skald/rune'
import { SKALD_LOADERS } from '@/lib/skald/voice'
import type { SkaldDistillResponse } from '@/app/api/ritual/skald-distill/route'
import type { RitualInference } from '@/app/api/ritual/infer/route'

const PROMPT_LABEL =
  'Tell me about your crew and your trip. Activity, place, the years, the people, any inside jokes — short or long, your choice.'

type Stage = 'intake' | 'distilling' | 'naming' | 'inferring' | 'confirm' | 'creating' | 'done'

export default function NewRitualHelpPage() {
  const [stage, setStage] = useState<Stage>('intake')
  const [intake, setIntake] = useState('')
  const [distill, setDistill] = useState<SkaldDistillResponse | null>(null)
  const [pickedName, setPickedName] = useState('')
  const [customName, setCustomName] = useState('')
  const [inference, setInference] = useState<RitualInference | null>(null)
  const [editingTagline, setEditingTagline] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState('')
  const [createdSlug, setCreatedSlug] = useState('')
  const [error, setError] = useState('')

  async function distillIntake() {
    const text = intake.trim()
    if (text.length < 4) return
    setStage('distilling')
    setError('')
    try {
      const res = await fetch('/api/ritual/skald-distill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake: text }),
      })
      if (!res.ok) throw new Error('distill failed')
      const data: SkaldDistillResponse = await res.json()
      setDistill(data)
      setStage('naming')
    } catch {
      setError('The Skald lost the thread. Try again.')
      setStage('intake')
    }
  }

  async function lockName(name: string) {
    if (!distill) return
    setPickedName(name)
    setStage('inferring')
    setError('')
    try {
      const res = await fetch('/api/ritual/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, context: intake }),
      })
      if (!res.ok) throw new Error('infer failed')
      const data: RitualInference = await res.json()
      // Trust the distill result for activity (it had the full intake context).
      // The inference call may classify differently with just the name; prefer distill.
      const merged: RitualInference = {
        ...data,
        activityType: distill.activityType,
        activityLabel: distill.activityLabel,
        isCustomActivity: distill.isCustomActivity,
      }
      setInference(merged)
      setStage('confirm')
    } catch {
      setError('Could not draft suggestions. Try again.')
      setStage('naming')
    }
  }

  async function handleCreate() {
    if (!inference || !pickedName) return
    setStage('creating')
    try {
      const { slug, inviteToken } = await createRitual(
        inference,
        pickedName.trim(),
        { logoUrl: logoPreview ?? null },
      )
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
        ritualName={pickedName}
        ritualSlug={createdSlug || inference?.slug || ''}
        inviteLink={inviteLink}
      />
    )
  }

  if (stage === 'confirm' || stage === 'creating' || stage === 'inferring') {
    return (
      <div
        className="max-w-2xl mx-auto px-4 min-h-[70vh] flex flex-col justify-center gap-10 py-8"
        style={{ paddingTop: 'calc(var(--header-height) + 24px)' }}
      >
        {!inference || stage === 'inferring' ? (
          <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
            <Loader2 size={14} className="animate-spin" />
            {SKALD_LOADERS.readingRunes}
          </div>
        ) : (
          <ConfirmScreen
            name={pickedName}
            inference={inference}
            setInference={setInference}
            editingTagline={editingTagline}
            setEditingTagline={setEditingTagline}
            logoPreview={logoPreview}
            setLogoPreview={setLogoPreview}
            creating={stage === 'creating'}
            onCreate={handleCreate}
            intakeContext={intake}
          />
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  if (stage === 'naming' && distill) {
    return (
      <div
        className="max-w-2xl mx-auto px-4 min-h-[70vh] flex flex-col gap-8 py-8"
        style={{ paddingTop: 'calc(var(--header-height) + 24px)' }}
      >
        <SkaldSpeaks tone="oration">{distill.acknowledgement}</SkaldSpeaks>

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
            Activity
          </span>
          <span className="text-sm text-[var(--fg)]">
            I hear you — this is a <span className="font-semibold">{distill.activityLabel}</span> ritual.
            {distill.isCustomActivity && (
              <span className="text-[var(--fg-muted)]"> Not in my templates yet. I&apos;ll set it up for your ritual.</span>
            )}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
            Pick a name — or speak your own.
          </span>
          <div className="flex flex-wrap gap-2">
            {distill.candidateNames.map((name) => (
              <button
                key={name}
                onClick={() => lockName(name)}
                className="px-4 py-2 rounded-full border border-[var(--border)] text-sm text-[var(--fg)] hover:border-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customName.trim()) lockName(customName.trim())
              }}
              placeholder="Or type your own name…"
              className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none text-base text-[var(--fg)] placeholder-[var(--fg-muted)] py-2"
            />
            <button
              onClick={() => customName.trim() && lockName(customName.trim())}
              disabled={!customName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50"
            >
              Lock it <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  // Intake stage
  return (
    <div
      className="max-w-2xl mx-auto px-4 min-h-[70vh] flex flex-col gap-6 py-8"
      style={{ paddingTop: 'calc(var(--header-height) + 24px)' }}
    >
      <SkaldSpeaks tone="oration">{PROMPT_LABEL}</SkaldSpeaks>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3"
      >
        <textarea
          autoFocus
          value={intake}
          onChange={(e) => setIntake(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              distillIntake()
            }
          }}
          placeholder="Six of us. Annual ski trip to Utah, started after college. Curse the bindings, lose money on parlays. We call it the Tour…"
          rows={8}
          disabled={stage === 'distilling'}
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 text-base text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none focus:border-[var(--fg-muted)] resize-y disabled:opacity-50"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--fg-muted)]">⌘/Ctrl+Enter to send</span>
          <button
            onClick={distillIntake}
            disabled={intake.trim().length < 4 || stage === 'distilling'}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50"
          >
            {stage === 'distilling' ? (
              <>
                <Loader2 size={14} className="animate-spin" /> {SKALD_LOADERS.listening}
              </>
            ) : (
              <>
                <Send size={14} /> Send to the Skald
              </>
            )}
          </button>
        </div>
      </motion.div>

      {stage === 'distilling' && (
        <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
          <Rune size={14} />
          {SKALD_LOADERS.listening}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
