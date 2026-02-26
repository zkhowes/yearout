'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Copy, ArrowRight, Loader2, Pencil, Plus, X, Upload, Sparkles } from 'lucide-react'
import { createRitual } from '@/lib/ritual-actions'
import type { RitualInference } from '@/app/api/ritual/infer/route'

// ─── Config ──────────────────────────────────────────────────────────────────

const ACTIVITY_LABELS: Record<string, string> = {
  ski: '⛷️  Ski / Snow',
  golf: '⛳  Golf',
  mountain_biking: '🚵  Mountain Biking',
  fishing: '🎣  Fishing',
  backpacking: '🎒  Backpacking',
  family: '🏡  Family',
  girls_trip: '✨  Girls Trip',
  other: '🧭  Other',
}

// Each theme card renders in its own colors so selection is a live preview
const THEME_CONFIG: Record<string, { label: string; bg: string; text: string; desc: string }> = {
  circuit: { label: 'The Circuit', bg: '#0a0a0a', text: '#c9a84c', desc: 'Dark. Grungy. Earned.' },
  club:    { label: 'The Club',    bg: '#1a2744', text: '#faf7f0', desc: 'Refined. Classic.' },
  trail:   { label: 'The Trail',   bg: '#2d5a3d', text: '#f7f4ee', desc: 'Earthy. Rugged.' },
  getaway: { label: 'The Getaway', bg: '#f06c2a', text: '#ffffff', desc: 'Warm. Joyful.' },
}

const AWARD_EMOJI = (i: number) => i === 0 ? '🏆' : i === 1 ? '🪣' : '🎖️'
const AWARD_PLACEHOLDER = (i: number) =>
  i === 0 ? 'Top award (e.g. MVP)' : i === 1 ? 'Anti-award (e.g. The Totem)' : 'Award name'

type Stage = 'input' | 'inferring' | 'confirm' | 'creating' | 'done'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NewRitualPage() {
  const [stage, setStage] = useState<Stage>('input')
  const [name, setName] = useState('')
  const [inference, setInference] = useState<RitualInference | null>(null)
  const [editingTagline, setEditingTagline] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

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
        setError('Could not generate suggestions. Try again.')
      }
    }, 600)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  async function handleCreate() {
    if (!inference) return
    setStage('creating')
    try {
      const { inviteToken } = await createRitual(inference, name.trim())
      const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
      setInviteLink(`${base}/join/${inviteToken}`)
      setStage('done')
    } catch {
      setStage('confirm')
      setError('Something went wrong. Try again.')
    }
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function addAward() {
    if (!inference) return
    setInference({ ...inference, awards: [...inference.awards, ''] })
  }

  function removeAward(i: number) {
    if (!inference) return
    setInference({ ...inference, awards: inference.awards.filter((_, idx) => idx !== i) })
  }

  function updateAward(i: number, val: string) {
    if (!inference) return
    const next = [...inference.awards]
    next[i] = val
    setInference({ ...inference, awards: next })
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  if (stage === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-8 px-2"
      >
        <div>
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-[var(--fg)]">{name} is live.</h2>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">Share this link with your crew.</p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <button
            onClick={copyLink}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-mono text-[var(--fg)] hover:bg-[var(--border)] transition-colors"
          >
            <span className="truncate text-left">{inviteLink}</span>
            {copied
              ? <Check size={16} className="shrink-0 text-green-500" />
              : <Copy size={16} className="shrink-0 text-[var(--fg-muted)]" />}
          </button>

          <button onClick={copyLink} className="w-full py-3 rounded-lg btn-accent text-sm font-semibold">
            {copied ? 'Copied!' : 'Copy invite link'}
          </button>

          <button
            onClick={() => router.push(`/${inference?.slug}`)}
            className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            Go to your Ritual →
          </button>
        </div>

        <p className="text-xs text-[var(--fg-muted)]">
          You can also invite crew from your ritual page anytime.
        </p>
      </motion.div>
    )
  }

  // ── Main create screen ────────────────────────────────────────────────────
  return (
    <div className="min-h-[70vh] flex flex-col justify-center gap-10 px-2 py-8">

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
            Setting up your ritual…
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm section */}
      <AnimatePresence>
        {stage === 'confirm' && inference && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-8"
          >

            {/* Tagline */}
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Tagline</span>
              {editingTagline ? (
                <input
                  autoFocus
                  value={inference.tagline}
                  onChange={(e) => setInference({ ...inference, tagline: e.target.value })}
                  onBlur={() => setEditingTagline(false)}
                  className="text-lg bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none text-[var(--fg)]"
                />
              ) : (
                <button
                  onClick={() => setEditingTagline(true)}
                  className="flex items-center gap-2 text-lg text-[var(--fg)] text-left group"
                >
                  {inference.tagline}
                  <Pencil size={12} className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
                </button>
              )}
            </div>

            {/* Activity */}
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Activity</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setInference({ ...inference, activityType: key as RitualInference['activityType'] })}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      inference.activityType === key
                        ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
                        : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme — each card renders in its own colors as a live preview */}
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Theme</span>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(THEME_CONFIG).map(([key, cfg]) => {
                  const isSelected = inference.theme === key
                  return (
                    <button
                      key={key}
                      onClick={() => setInference({ ...inference, theme: key as RitualInference['theme'] })}
                      style={{ backgroundColor: cfg.bg, borderColor: cfg.bg }}
                      className={`flex flex-col gap-1 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-[var(--fg)] scale-[1.03]'
                          : 'opacity-60 hover:opacity-80'
                      }`}
                    >
                      <span className="text-sm font-semibold" style={{ color: cfg.text }}>
                        {cfg.label}
                      </span>
                      <span className="text-xs leading-tight" style={{ color: cfg.text, opacity: 0.65 }}>
                        {cfg.desc}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Logo */}
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Logo</span>
              <div className="flex items-center gap-4">
                {/* Preview */}
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] flex items-center justify-center shrink-0 overflow-hidden">
                  {logoPreview
                    ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    : <span className="text-2xl select-none opacity-40">⬡</span>}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
                  >
                    <Upload size={13} /> Upload your own
                  </button>
                  <button
                    disabled
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--fg-muted)] opacity-40 cursor-not-allowed"
                    title="Coming soon — needs image generation API"
                  >
                    <Sparkles size={13} /> Generate with AI
                  </button>
                </div>
              </div>
              <p className="text-xs text-[var(--fg-muted)]">You can always update this from your ritual settings.</p>
            </div>

            {/* Awards */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Awards</span>
                <span className="text-xs text-[var(--fg-muted)]">Optional</span>
              </div>

              <div className="flex flex-col gap-2">
                {inference.awards.map((award, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
                  >
                    <span className="text-base shrink-0">{AWARD_EMOJI(i)}</span>
                    <input
                      value={award}
                      placeholder={AWARD_PLACEHOLDER(i)}
                      onChange={(e) => updateAward(i, e.target.value)}
                      className="flex-1 bg-transparent outline-none text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
                    />
                    <button
                      onClick={() => removeAward(i)}
                      className="text-[var(--fg-muted)] hover:text-red-400 transition-colors shrink-0 p-0.5"
                      aria-label="Remove award"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {inference.awards.length === 0 && (
                  <p className="text-xs text-[var(--fg-muted)] italic px-1">
                    No awards — sometimes that&apos;s the right call.
                  </p>
                )}

                <button
                  onClick={addAward}
                  className="flex items-center gap-1.5 self-start px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
                >
                  <Plus size={13} /> Add award
                </button>
              </div>
            </div>

            {/* URL preview */}
            <p className="text-xs text-[var(--fg-muted)] font-mono">
              yearout.zkhowes.fun/<span className="text-[var(--fg)]">{inference.slug}</span>
            </p>

            {/* Create */}
            <button
              onClick={handleCreate}
              disabled={(stage as Stage) === 'creating'}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl btn-accent text-base font-semibold disabled:opacity-50"
            >
              {(stage as Stage) === 'creating' ? (
                <><Loader2 size={16} className="animate-spin" /> Creating…</>
              ) : (
                <>Create {name} <ArrowRight size={16} /></>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
