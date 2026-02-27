'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { updateRitual } from '@/lib/ritual-actions'

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

type Ritual = {
  id: string
  name: string
  tagline: string | null
  theme: string
  activityType: string
  foundingYear: string | null
  bylaws: string | null
  inviteToken: string
  slug: string
}

export function SettingsForm({ ritual, appUrl }: { ritual: Ritual; appUrl: string }) {
  const [name, setName] = useState(ritual.name)
  const [tagline, setTagline] = useState(ritual.tagline ?? '')
  const [theme, setTheme] = useState(ritual.theme)
  const [activityType, setActivityType] = useState(ritual.activityType)
  const [foundingYear, setFoundingYear] = useState(ritual.foundingYear ?? '')
  const [bylaws, setBylaws] = useState(ritual.bylaws ?? '')
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  const inviteLink = `${appUrl}/join/${ritual.inviteToken}`
  const [copied, setCopied] = useState(false)

  function copyInvite() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function save() {
    startTransition(async () => {
      await updateRitual(ritual.id, { name, tagline, theme: theme as 'circuit' | 'club' | 'trail' | 'getaway', activityType, foundingYear, bylaws })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="flex flex-col gap-10">

      {/* ── Identity ── */}
      <section className="flex flex-col gap-5">
        <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Identity</h2>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-[var(--fg-muted)]">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-xl font-bold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-[var(--fg)] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-[var(--fg-muted)]">Tagline</label>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="3–6 word punchy phrase"
            className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-[var(--fg-muted)]">Founding Year</label>
          <input
            value={foundingYear}
            onChange={(e) => setFoundingYear(e.target.value)}
            placeholder="e.g. 2009"
            className="w-32 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-[var(--fg-muted)]">Bylaws / Motto</label>
          <textarea
            value={bylaws}
            onChange={(e) => setBylaws(e.target.value)}
            rows={3}
            placeholder="The rules, the creed, the legend."
            className="w-full bg-transparent border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:border-[var(--fg)] outline-none resize-none transition-colors"
          />
        </div>
      </section>

      {/* ── Activity ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Activity</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActivityType(key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activityType === key
                  ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
                  : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Theme ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Theme</h2>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(THEME_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              style={{ backgroundColor: cfg.bg, borderColor: cfg.bg }}
              className={`flex flex-col gap-1 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                theme === key
                  ? 'ring-2 ring-offset-2 ring-[var(--fg)] scale-[1.03]'
                  : 'opacity-60 hover:opacity-80'
              }`}
            >
              <span className="text-sm font-semibold" style={{ color: cfg.text }}>{cfg.label}</span>
              <span className="text-xs leading-tight" style={{ color: cfg.text, opacity: 0.65 }}>{cfg.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Invite link ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Invite Link</h2>
        <button
          onClick={copyInvite}
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-mono text-[var(--fg)] hover:bg-[var(--border)] transition-colors"
        >
          <span className="truncate text-left text-xs">{inviteLink}</span>
          {copied
            ? <Check size={14} className="shrink-0 text-green-500" />
            : <span className="shrink-0 text-xs text-[var(--fg-muted)]">Copy</span>}
        </button>
        <p className="text-xs text-[var(--fg-muted)]">Anyone with this link can join as a crew member.</p>
      </section>

      {/* ── Save ── */}
      <button
        onClick={save}
        disabled={pending}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-xl btn-accent text-base font-semibold disabled:opacity-50"
      >
        {pending ? (
          <><Loader2 size={16} className="animate-spin" /> Saving…</>
        ) : saved ? (
          <><Check size={16} /> Saved</>
        ) : (
          'Save Changes'
        )}
      </button>
    </div>
  )
}
