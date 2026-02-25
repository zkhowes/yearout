'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { createEvent } from '@/lib/event-actions'

const THIS_YEAR = new Date().getFullYear()

export function NewEventForm({
  ritualId,
  ritualSlug,
  ritualName,
}: {
  ritualId: string
  ritualSlug: string
  ritualName: string
}) {
  const [year, setYear] = useState(THIS_YEAR)
  const [location, setLocation] = useState('')
  const [name, setName] = useState(`${ritualName} ${THIS_YEAR}`)
  const [nameEdited, setNameEdited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-update name only if user hasn't manually edited it
  useEffect(() => {
    if (nameEdited) return
    const loc = location.trim()
    setName(loc ? `${ritualName} ${loc} ${year}` : `${ritualName} ${year}`)
  }, [year, location, ritualName, nameEdited])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createEvent(ritualId, ritualSlug, {
        name: name.trim() || `${ritualName} ${year}`,
        year,
        location: location.trim() || undefined,
      })
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Year */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
          Year
        </label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          min={2000}
          max={2100}
          className="w-28 text-3xl font-bold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-[var(--fg)]"
        />
      </div>

      {/* Location */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
          Location
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Whistler, BC"
          className="w-full text-xl bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-2 text-[var(--fg)] placeholder-[var(--fg-muted)] transition-colors"
        />
      </div>

      {/* Event name — auto-generated, manually editable */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
          Event Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setNameEdited(true) }}
          className="w-full text-xl font-semibold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-2 text-[var(--fg)] transition-colors"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-xl btn-accent text-base font-semibold disabled:opacity-50"
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Creating…</>
        ) : (
          <>Add to the legend <ArrowRight size={16} /></>
        )}
      </button>
    </form>
  )
}
