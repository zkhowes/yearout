'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Pencil, Plus, X, Upload } from 'lucide-react'
import { Rune } from '@/components/skald/rune'
import { SkaldSpeaks } from '@/components/skald/skald-speaks'
import type { RitualInference } from '@/app/api/ritual/infer/route'

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

const THEME_CONFIG: Record<string, { label: string; bg: string; text: string; desc: string }> = {
  circuit: { label: 'The Circuit', bg: '#0a0a0a', text: '#c9a84c', desc: 'Dark. Grungy. Earned.' },
  club:    { label: 'The Club',    bg: '#1a2744', text: '#faf7f0', desc: 'Refined. Classic.' },
  trail:   { label: 'The Trail',   bg: '#2d5a3d', text: '#f7f4ee', desc: 'Earthy. Rugged.' },
  getaway: { label: 'The Getaway', bg: '#f06c2a', text: '#ffffff', desc: 'Warm. Joyful.' },
}

const AWARD_EMOJI = (i: number) => i === 0 ? '🏆' : i === 1 ? '🪣' : '🎖️'
const AWARD_PLACEHOLDER = (i: number) =>
  i === 0 ? 'Top award (e.g. MVP)' : i === 1 ? 'Anti-award (e.g. The Totem)' : 'Award name'

type Props = {
  name: string
  inference: RitualInference
  setInference: (i: RitualInference) => void
  editingTagline: boolean
  setEditingTagline: (v: boolean) => void
  logoPreview: string | null
  setLogoPreview: (v: string | null) => void
  creating: boolean
  onCreate: () => void
}

export function ConfirmScreen({
  name,
  inference,
  setInference,
  editingTagline,
  setEditingTagline,
  logoPreview,
  setLogoPreview,
  creating,
  onCreate,
}: Props) {
  const logoInputRef = useRef<HTMLInputElement>(null)

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function addAward() {
    setInference({ ...inference, awards: [...inference.awards, ''] })
  }

  function removeAward(i: number) {
    setInference({ ...inference, awards: inference.awards.filter((_, idx) => idx !== i) })
  }

  function updateAward(i: number, val: string) {
    const next = [...inference.awards]
    next[i] = val
    setInference({ ...inference, awards: next })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8"
    >
      <SkaldSpeaks tone="brief">
        I drafted these from what I know. Edit anything that is off.
      </SkaldSpeaks>

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
            <Pencil size={16} className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
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
              className={`px-3 py-2 rounded-full text-sm border transition-colors ${
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
            >
              <Upload size={14} /> Upload your own
            </button>
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--fg-muted)] opacity-40 cursor-not-allowed"
              title="The Skald cannot draw yet. Coming."
            >
              <Rune size={14} /> Have the Skald draft one. Coming soon.
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
            className="flex items-center gap-1.5 self-start px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
          >
            <Plus size={16} /> Add award
          </button>
        </div>
      </div>

      {/* URL preview */}
      <p className="text-xs text-[var(--fg-muted)] font-mono">
        yearout.zkhowes.fun/<span className="text-[var(--fg)]">{inference.slug}</span>
      </p>

      {/* Create */}
      <button
        onClick={onCreate}
        disabled={creating}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-xl btn-accent text-base font-semibold disabled:opacity-50"
      >
        {creating ? (
          <><Loader2 size={16} className="animate-spin" /> Creating…</>
        ) : (
          <>Create {name} <ArrowRight size={16} /></>
        )}
      </button>
    </motion.div>
  )
}
