'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowRight, ArrowLeft, Loader2, Plus, X, Megaphone, Upload, Check } from 'lucide-react'
import { createCall, quickEnterEvent, historyEnterEvent } from '@/lib/event-actions'
import { CalendarRangePicker, type DateRange } from '@/components/calendar-range-picker'

const THIS_YEAR = new Date().getFullYear()

type CrewUser = {
  id: string
  name: string | null
  image: string | null
}

type AwardDef = {
  id: string
  name: string
  label: string
  type: string
}

export function NewEventForm({
  ritualId,
  ritualSlug,
  ritualName,
  currentUserId,
  crewUsers,
  awardDefs,
}: {
  ritualId: string
  ritualSlug: string
  ritualName: string
  currentUserId: string
  crewUsers: CrewUser[]
  awardDefs: AwardDef[]
}) {
  const [mode, setMode] = useState<'plan' | 'quick' | 'history'>('plan')

  const modeBtn = (m: typeof mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
        mode === m
          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
          : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-8">
      {/* Mode toggle */}
      <div className="flex rounded-xl border border-[var(--border)] overflow-hidden">
        {modeBtn('plan', 'The Call')}
        {modeBtn('quick', 'Already Confirmed')}
        {modeBtn('history', 'Already Happened')}
      </div>

      {mode === 'plan' ? (
        <CallForm ritualId={ritualId} ritualSlug={ritualSlug} ritualName={ritualName} />
      ) : mode === 'quick' ? (
        <QuickEnterForm
          ritualId={ritualId}
          ritualSlug={ritualSlug}
          ritualName={ritualName}
          currentUserId={currentUserId}
          crewUsers={crewUsers}
        />
      ) : (
        <HistoryForm
          ritualId={ritualId}
          ritualSlug={ritualSlug}
          ritualName={ritualName}
          currentUserId={currentUserId}
          crewUsers={crewUsers}
          awardDefs={awardDefs}
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

// ─── History Form (Already Happened) ──────────────────────────────────────────

const HISTORY_STEPS = ['Basics', 'Logo', 'Crew', 'Awards', 'Edit', 'Lore'] as const

function HistoryForm({
  ritualId,
  ritualSlug,
  ritualName,
  currentUserId,
  crewUsers,
  awardDefs,
}: {
  ritualId: string
  ritualSlug: string
  ritualName: string
  currentUserId: string
  crewUsers: CrewUser[]
  awardDefs: AwardDef[]
}) {
  const [step, setStep] = useState(0)

  // Step 1: Basics
  const [year, setYear] = useState(THIS_YEAR - 1)
  const [location, setLocation] = useState('')
  const [mountains, setMountains] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [name, setName] = useState(`${ritualName} ${THIS_YEAR - 1}`)
  const [nameEdited, setNameEdited] = useState(false)

  // Step 2: Logo
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Step 3: Attendees
  const [attendeeIds, setAttendeeIds] = useState<string[]>([])
  const [hostIds, setHostIds] = useState<string[]>([currentUserId])

  // Step 4: Awards
  const [awardWinners, setAwardWinners] = useState<Record<string, string>>({})

  // Step 5: Edit (video)
  const [editUrl, setEditUrl] = useState('')

  // Step 6: Lore
  const [loreEntries, setLoreEntries] = useState<string[]>([''])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-generate name
  useEffect(() => {
    if (nameEdited) return
    const loc = location.trim()
    setName(loc ? `${loc} ${year}` : `${ritualName} ${year}`)
  }, [year, location, ritualName, nameEdited])

  // Keep hostIds in sync with attendeeIds
  useEffect(() => {
    setHostIds((prev) => prev.filter((id) => attendeeIds.includes(id)))
  }, [attendeeIds])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json()
      setLogoUrl(url)
    } catch {
      setError('Logo upload failed. Try again.')
    } finally {
      setLogoUploading(false)
    }
  }

  function canAdvance(): boolean {
    if (step === 0) return location.trim().length > 0
    if (step === 2) return attendeeIds.length > 0
    return true
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const awards = Object.entries(awardWinners)
        .filter(([, winnerId]) => winnerId)
        .map(([awardDefinitionId, winnerId]) => ({ awardDefinitionId, winnerId }))

      const lore = loreEntries.map((l) => l.trim()).filter(Boolean)

      await historyEnterEvent(ritualId, ritualSlug, {
        name: name.trim() || `${location.trim()} ${year}`,
        year,
        location: location.trim(),
        mountains: mountains.trim() || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        logoUrl: logoUrl || undefined,
        attendeeIds,
        hostIds: hostIds.length > 0 ? hostIds : [currentUserId],
        awards,
        editUrl: editUrl.trim() || undefined,
        loreEntries: lore.length > 0 ? lore : undefined,
      })
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-2 text-[var(--fg)] placeholder-[var(--fg-muted)] transition-colors'
  const isLast = step === HISTORY_STEPS.length - 1

  // Attendees filtered for award winner selection
  const selectedCrew = crewUsers.filter((u) => attendeeIds.includes(u.id))

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5 justify-center">
        {HISTORY_STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => i < step && setStep(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === step
                ? 'w-8 bg-[var(--accent)]'
                : i < step
                  ? 'w-4 bg-[var(--accent)] opacity-40 cursor-pointer'
                  : 'w-4 bg-[var(--border)]'
            }`}
            title={label}
          />
        ))}
      </div>
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)] text-center">
        {HISTORY_STEPS[step]}
      </p>

      {/* ── Step 1: Basics ── */}
      {step === 0 && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              min={1900}
              max={THIS_YEAR}
              className="w-28 text-3xl font-bold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-[var(--fg)]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Location *</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Whistler, BC"
              className={`text-xl ${inputCls}`}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Mountains / Venues (optional)</label>
            <input
              type="text"
              value={mountains}
              onChange={(e) => setMountains(e.target.value)}
              placeholder="Blackcomb, Whistler"
              className={`text-base ${inputCls}`}
            />
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Dates (optional)</label>
            <div className="flex gap-4">
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-xs text-[var(--fg-muted)]">Start</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-sm text-[var(--fg)]" />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-xs text-[var(--fg-muted)]">End</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-1 text-sm text-[var(--fg)]" />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Event Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameEdited(true) }}
              className={`text-xl font-semibold ${inputCls}`}
            />
          </div>
        </div>
      )}

      {/* ── Step 2: Logo ── */}
      {step === 1 && (
        <div className="flex flex-col items-center gap-6 py-4">
          <p className="text-sm text-[var(--fg-muted)] text-center">
            Did this event have a logo or emblem?
          </p>
          <div
            onClick={() => !logoUploading && logoInputRef.current?.click()}
            className="w-32 h-32 rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center cursor-pointer hover:border-[var(--fg)] transition-colors overflow-hidden"
          >
            {logoUploading ? (
              <Loader2 size={24} className="animate-spin text-[var(--fg-muted)]" />
            ) : logoUrl ? (
              <img src={logoUrl} alt="Event logo" className="w-full h-full object-cover" />
            ) : (
              <Upload size={24} className="text-[var(--fg-muted)]" />
            )}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
          {logoUrl && (
            <button
              type="button"
              onClick={() => setLogoUrl(null)}
              className="text-xs text-[var(--fg-muted)] hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      )}

      {/* ── Step 3: Attendees ── */}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-[var(--fg-muted)]">
            Who went? Tap to select.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {crewUsers.map((u) => {
              const selected = attendeeIds.includes(u.id)
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() =>
                    setAttendeeIds((prev) =>
                      selected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                    )
                  }
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    selected
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                      : 'border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--border)] relative">
                    {u.image ? (
                      <img src={u.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold">
                        {u.name?.[0] ?? '?'}
                      </div>
                    )}
                    {selected && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Check size={20} className="text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium truncate w-full text-center">
                    {u.name?.split(' ')[0] ?? 'Unknown'}
                  </span>
                </button>
              )
            })}
          </div>

          {attendeeIds.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Hosts</label>
              <div className="flex flex-wrap gap-2">
                {selectedCrew.map((u) => {
                  const isHost = hostIds.includes(u.id)
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() =>
                        setHostIds((prev) =>
                          isHost ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        isHost
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
          )}
        </div>
      )}

      {/* ── Step 4: Awards ── */}
      {step === 3 && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-[var(--fg-muted)]">
            Were awards given? Assign winners from the crew.
          </p>
          {awardDefs.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)] italic">
              No awards configured for this ritual. You can add them in settings.
            </p>
          ) : (
            awardDefs.map((award) => (
              <div key={award.id} className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
                  {award.name} — {award.label}
                </label>
                <select
                  value={awardWinners[award.id] ?? ''}
                  onChange={(e) =>
                    setAwardWinners((prev) => ({ ...prev, [award.id]: e.target.value }))
                  }
                  className="w-full bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--fg)] outline-none pb-2 text-base text-[var(--fg)]"
                >
                  <option value="">— None —</option>
                  {selectedCrew.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ?? u.id}
                    </option>
                  ))}
                </select>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Step 5: Edit (Video) ── */}
      {step === 4 && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-[var(--fg-muted)]">
            Was there a trip edit? Paste a YouTube or Vimeo link.
          </p>
          <input
            type="url"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className={`text-base ${inputCls}`}
          />
        </div>
      )}

      {/* ── Step 6: Lore ── */}
      {step === 5 && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-[var(--fg-muted)]">
            Any memories or moments worth preserving?
          </p>
          {loreEntries.map((entry, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea
                value={entry}
                onChange={(e) =>
                  setLoreEntries((prev) => prev.map((l, j) => (j === i ? e.target.value : l)))
                }
                placeholder="That time we..."
                rows={3}
                className={`text-base resize-none ${inputCls}`}
              />
              {loreEntries.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLoreEntries((prev) => prev.filter((_, j) => j !== i))}
                  className="p-1 mt-1 text-[var(--fg-muted)] hover:text-red-400"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLoreEntries([...loreEntries, ''])}
            className="flex items-center gap-1.5 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            <Plus size={16} /> Add another memory
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="flex items-center justify-center gap-2 flex-1 py-4 rounded-xl border border-[var(--border)] text-[var(--fg-muted)] text-base font-semibold hover:text-[var(--fg)] transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}
        {isLast ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !canAdvance()}
            className="flex items-center justify-center gap-2 flex-1 py-4 rounded-xl btn-accent text-base font-semibold disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Creating…</>
            ) : (
              <>Seal it <ArrowRight size={16} /></>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canAdvance()}
            className="flex items-center justify-center gap-2 flex-1 py-4 rounded-xl btn-accent text-base font-semibold disabled:opacity-50"
          >
            {step === 1 && !logoUrl ? 'Skip' : step === 3 && Object.values(awardWinners).every((v) => !v) ? 'Skip' : step === 4 && !editUrl ? 'Skip' : 'Next'} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
