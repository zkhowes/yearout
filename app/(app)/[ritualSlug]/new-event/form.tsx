'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Loader2, Plus, X, Megaphone } from 'lucide-react'
import { createCall, quickEnterEvent } from '@/lib/event-actions'
import { CalendarRangePicker, type DateRange } from '@/components/calendar-range-picker'

const THIS_YEAR = new Date().getFullYear()

type CrewUser = {
  id: string
  name: string | null
  image: string | null
}

export function NewEventForm({
  ritualId,
  ritualSlug,
  ritualName,
  currentUserId,
  crewUsers,
}: {
  ritualId: string
  ritualSlug: string
  ritualName: string
  currentUserId: string
  crewUsers: CrewUser[]
}) {
  const [mode, setMode] = useState<'plan' | 'quick'>('plan')

  return (
    <div className="flex flex-col gap-8">
      {/* Mode toggle */}
      <div className="flex rounded-xl border border-[var(--border)] overflow-hidden">
        <button
          type="button"
          onClick={() => setMode('plan')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            mode === 'plan'
              ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
          }`}
        >
          The Call
        </button>
        <button
          type="button"
          onClick={() => setMode('quick')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            mode === 'quick'
              ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
          }`}
        >
          Already confirmed
        </button>
      </div>

      {mode === 'plan' ? (
        <CallForm ritualId={ritualId} ritualSlug={ritualSlug} ritualName={ritualName} />
      ) : (
        <QuickEnterForm
          ritualId={ritualId}
          ritualSlug={ritualSlug}
          ritualName={ritualName}
          currentUserId={currentUserId}
          crewUsers={crewUsers}
        />
      )}
    </div>
  )
}

// ─── The Call Form ────────────────────────────────────────────────────────────

function CallForm({
  ritualId,
  ritualSlug,
}: {
  ritualId: string
  ritualSlug: string
  ritualName: string
}) {
  const [year, setYear] = useState(THIS_YEAR)
  const [callMode, setCallMode] = useState<'best_fit' | 'all_or_none'>('best_fit')
  const [dateRanges, setDateRanges] = useState<DateRange[]>([])
  const [locations, setLocations] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function updateLocation(index: number, value: string) {
    setLocations((prev) => prev.map((l, i) => (i === index ? value : l)))
  }

  function addLocation() {
    if (locations.length < 3) setLocations([...locations, ''])
  }

  function removeLocation(index: number) {
    if (locations.length > 1) setLocations(locations.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validLocations = locations.map((l) => l.trim()).filter(Boolean)
    if (dateRanges.length === 0) {
      setError('Select at least one date range.')
      return
    }
    if (validLocations.length === 0) {
      setError('Add at least one location.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await createCall(ritualId, ritualSlug, {
        year,
        callMode,
        dateRanges: dateRanges.map((r) => ({ startDate: r.start, endDate: r.end })),
        locations: validLocations,
      })
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-2 text-[var(--fg)] placeholder-[var(--fg-muted)] transition-colors'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Year */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Year</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          min={2000}
          max={2100}
          className="w-28 text-3xl font-bold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-[var(--fg)]"
        />
      </div>

      {/* Call Mode */}
      <div className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Mode</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCallMode('best_fit')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm border transition-all text-left ${
              callMode === 'best_fit'
                ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                : 'border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            <span className="font-semibold block">Best Fit</span>
            <span className="text-xs opacity-75">Works for most</span>
          </button>
          <button
            type="button"
            onClick={() => setCallMode('all_or_none')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm border transition-all text-left ${
              callMode === 'all_or_none'
                ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                : 'border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            <span className="font-semibold block">All or None</span>
            <span className="text-xs opacity-75">Everyone or bust</span>
          </button>
        </div>
      </div>

      {/* Date Ranges — Calendar Picker */}
      <div className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Date Ranges</label>
        <CalendarRangePicker ranges={dateRanges} onChange={setDateRanges} maxRanges={3} />
      </div>

      {/* Locations */}
      <div className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Locations</label>
        {locations.map((loc, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={loc}
              onChange={(e) => updateLocation(i, e.target.value)}
              placeholder={i === 0 ? 'Park City, UT' : i === 1 ? 'Whistler, BC' : 'Breckenridge, CO'}
              className={`text-base ${inputCls}`}
            />
            {locations.length > 1 && (
              <button
                type="button"
                onClick={() => removeLocation(i)}
                className="p-1 text-[var(--fg-muted)] hover:text-red-400"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        {locations.length < 3 && (
          <button
            type="button"
            onClick={addLocation}
            className="flex items-center gap-1.5 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            <Plus size={16} /> Add location
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading || dateRanges.length === 0}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-xl btn-accent text-base font-semibold disabled:opacity-50"
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Issuing The Call…</>
        ) : (
          <><Megaphone size={16} /> Issue The Call</>
        )}
      </button>
    </form>
  )
}

// ─── Quick Enter Form ─────────────────────────────────────────────────────────

function QuickEnterForm({
  ritualId,
  ritualSlug,
  ritualName,
  currentUserId,
  crewUsers,
}: {
  ritualId: string
  ritualSlug: string
  ritualName: string
  currentUserId: string
  crewUsers: CrewUser[]
}) {
  const [year, setYear] = useState(THIS_YEAR)
  const [location, setLocation] = useState('')
  const [mountains, setMountains] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [hostIds, setHostIds] = useState<string[]>([currentUserId])
  const [status, setStatus] = useState<'scheduled' | 'in_progress' | 'concluded' | 'closed'>('scheduled')
  const [mvpWinnerId, setMvpWinnerId] = useState('')
  const [lupWinnerId, setLupWinnerId] = useState('')
  const [name, setName] = useState(`${ritualName} ${THIS_YEAR}`)
  const [nameEdited, setNameEdited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (nameEdited) return
    const loc = location.trim()
    setName(loc ? `${loc} ${year}` : `${ritualName} ${year}`)
  }, [year, location, ritualName, nameEdited])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!location.trim()) {
      setError('Location is required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await quickEnterEvent(ritualId, ritualSlug, {
        name: name.trim() || `${location.trim()} ${year}`,
        year,
        location: location.trim(),
        mountains: mountains.trim() || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        hostIds,
        status,
        mvpWinnerId: status === 'closed' && mvpWinnerId ? mvpWinnerId : undefined,
        lupWinnerId: status === 'closed' && lupWinnerId ? lupWinnerId : undefined,
      })
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-2 text-[var(--fg)] placeholder-[var(--fg-muted)] transition-colors'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">

      {/* Year */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Year</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          min={2000}
          max={2100}
          className="w-28 text-3xl font-bold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-[var(--fg)]"
        />
      </div>

      {/* Location (required) */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Location *</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Whistler, BC"
          required
          className={`text-xl ${inputCls}`}
        />
      </div>

      {/* Mountains (optional) */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Mountains (optional)</label>
        <input
          type="text"
          value={mountains}
          onChange={(e) => setMountains(e.target.value)}
          placeholder="Blackcomb, Whistler"
          className={`text-base ${inputCls}`}
        />
      </div>

      {/* Date range */}
      <div className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Dates</label>
        <div className="flex gap-4">
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-xs text-[var(--fg-muted)]">Start</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-sm text-[var(--fg)]"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-xs text-[var(--fg-muted)]">End</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-sm text-[var(--fg)]"
            />
          </div>
        </div>
      </div>

      {/* Hosts */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Hosts</label>
        <div className="flex flex-wrap gap-2">
          {crewUsers.map((u) => {
            const selected = hostIds.includes(u.id)
            return (
              <button
                key={u.id}
                type="button"
                onClick={() =>
                  setHostIds((prev) =>
                    selected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                  )
                }
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                  selected
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                    : 'border-[var(--border)] text-[var(--fg-muted)]'
                }`}
              >
                {u.name?.split(' ')[0] ?? u.id}
              </button>
            )
          })}
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Status</label>
        <div className="flex gap-2">
          {(['scheduled', 'in_progress', 'concluded', 'closed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                status === s
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                  : 'border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
              }`}
            >
              {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Closed: MVP + LUP winners */}
      {status === 'closed' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">MVP Winner (optional)</label>
            <select
              value={mvpWinnerId}
              onChange={(e) => setMvpWinnerId(e.target.value)}
              className="w-full bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-2 text-base text-[var(--fg)]"
            >
              <option value="">— None —</option>
              {crewUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.id}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">LUP Winner (optional)</label>
            <select
              value={lupWinnerId}
              onChange={(e) => setLupWinnerId(e.target.value)}
              className="w-full bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-2 text-base text-[var(--fg)]"
            >
              <option value="">— None —</option>
              {crewUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.id}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Event name */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Event Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setNameEdited(true) }}
          className={`text-xl font-semibold ${inputCls}`}
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
          <>Enter event <ArrowRight size={16} /></>
        )}
      </button>
    </form>
  )
}
