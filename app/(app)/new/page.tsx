'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Copy, ArrowRight, Loader2, Pencil } from 'lucide-react'
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

const THEME_CONFIG = {
  circuit: { label: 'The Circuit', color: '#0a0a0a', text: '#c9a84c', desc: 'Dark. Grungy. Earned.' },
  club:    { label: 'The Club',    color: '#1a2744', text: '#faf7f0', desc: 'Refined. Classic.' },
  trail:   { label: 'The Trail',   color: '#2d5a3d', text: '#f7f4ee', desc: 'Earthy. Rugged.' },
  getaway: { label: 'The Getaway', color: '#f06c2a', text: '#ffffff', desc: 'Warm. Joyful.' },
}

type Stage = 'input' | 'inferring' | 'confirm' | 'creating' | 'done'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NewRitualPage() {
  const [stage, setStage] = useState<Stage>('input')
  const [name, setName] = useState('')
  const [inference, setInference] = useState<RitualInference | null>(null)
  const [editingTagline, setEditingTagline] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Auto-focus
  useEffect(() => { inputRef.current?.focus() }, [])

  // Infer on name change (debounced)
  useEffect(() => {
    if (stage !== 'input' && stage !== 'inferring') return
    if (name.trim().length < 3) {
      setInference(null)
      return
    }
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

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Done / invite screen ──────────────────────────────────────────────────
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
            {copied ? <Check size={16} className="shrink-0 text-green-500" /> : <Copy size={16} className="shrink-0 text-[var(--fg-muted)]" />}
          </button>

          <button
            onClick={copyLink}
            className="w-full py-3 rounded-lg btn-accent text-sm font-semibold"
          >
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
          placeholder="The Torture Tour"
          className="w-full text-3xl font-bold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-2 text-[var(--fg)] placeholder-[var(--fg-muted)] transition-colors"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Inferring state */}
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
            className="flex flex-col gap-6"
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

            {/* Theme */}
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Theme</span>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(THEME_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setInference({ ...inference, theme: key as RitualInference['theme'] })}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                      inference.theme === key
                        ? 'border-[var(--fg)] ring-1 ring-[var(--fg)]'
                        : 'border-[var(--border)] hover:border-[var(--fg-muted)]'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full shrink-0"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-[var(--fg)] truncate">{cfg.label}</span>
                      <span className="text-xs text-[var(--fg-muted)]">{cfg.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Awards */}
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Awards</span>
              <div className="flex flex-wrap gap-2">
                {inference.awards.map((award, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] text-sm text-[var(--fg)]">
                    <span className="text-xs text-[var(--fg-muted)]">{i === 0 ? '🏆' : '🪣'}</span>
                    <input
                      value={award}
                      onChange={(e) => {
                        const next = [...inference.awards]
                        next[i] = e.target.value
                        setInference({ ...inference, awards: next })
                      }}
                      className="bg-transparent outline-none w-24 text-sm"
                    />
                  </div>
                ))}
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
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl btn-accent text-base font-semibold mt-2 disabled:opacity-50"
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
