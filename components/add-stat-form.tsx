'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { addActivityResult } from '@/lib/event-actions'

const SKI_METRICS = ['fastest_speed', 'skier_cross_wins', 'vertical_feet']

type Attendee = {
  id: string
  userId: string
  bookingStatus: string
  isHost: boolean
}

type AttendeeUser = {
  id: string
  name: string | null
  image: string | null
}

export function AddStatForm({
  eventId,
  eventYear,
  ritualSlug,
  attendees,
  attendeeUsers,
  currentUserId,
  isSponsor,
  onClose,
}: {
  eventId: string
  eventYear: number
  ritualSlug: string
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  currentUserId: string
  isSponsor: boolean
  onClose: () => void
}) {
  const [userId, setUserId] = useState(currentUserId)
  const [metric, setMetric] = useState('')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('')
  const [day, setDay] = useState('')
  const [pending, startSubmit] = useTransition()
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!metric.trim() || !value.trim()) return
    startSubmit(async () => {
      await addActivityResult(
        eventId,
        ritualSlug,
        eventYear,
        userId,
        metric,
        value,
        unit.trim() || undefined,
        day ? new Date(day) : undefined
      )
      onClose()
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]"
    >
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Add Result</p>

      {isSponsor && (
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)]"
        >
          {attendees.map((a) => {
            const user = userMap.get(a.userId)
            return (
              <option key={a.userId} value={a.userId}>
                {user?.name ?? a.userId}
              </option>
            )
          })}
        </select>
      )}

      <div className="relative">
        <input
          list="metric-suggestions-fab"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          placeholder="Metric (e.g. fastest_speed)"
          className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
        />
        <datalist id="metric-suggestions-fab">
          {SKI_METRICS.map((m) => <option key={m} value={m} />)}
        </datalist>
      </div>

      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Value"
          className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unit"
          className="w-24 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
        />
      </div>

      <input
        type="date"
        value={day}
        onChange={(e) => setDay(e.target.value)}
        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)]"
      />

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending || !metric.trim() || !value.trim()}
          className="px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={16} />}
          Add
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
