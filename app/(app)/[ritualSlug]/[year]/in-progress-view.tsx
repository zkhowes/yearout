'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, Trash2, Pencil, Calendar, Home, Plane, Award } from 'lucide-react'
import {
  addActivityResult,
  addItineraryDay,
  updateItineraryDay,
  deleteItineraryDay,
} from '@/lib/event-actions'
import { ExpensesTab } from '@/components/expenses-tab'
import { CloseoutView } from './closeout-view'
import { AwardsPodium } from './awards-podium'
import { EventDetailsCard } from './closed-view'
import { LoreFeed } from '@/components/lore/lore-feed'
import type { LoreEntryData } from '@/components/lore/lore-post'
import { BookingsSection, type EventBooking } from '@/components/bookings-section'

type Attendee = {
  id: string
  userId: string
  bookingStatus: string
  isHost: boolean
  arrivalAirline: string | null
  arrivalFlightNumber: string | null
  arrivalDatetime: Date | null
  departureAirline: string | null
  departureFlightNumber: string | null
  departureDatetime: Date | null
}

type AttendeeUser = {
  id: string
  name: string | null
  image: string | null
  nationality: string | null
}

type Expense = {
  id: string
  paidBy: string
  description: string
  amount: number
  splitType: string
  category: string | null
  createdAt: Date
  splits: { userId: string; amount: number }[]
}

type SettlementPayment = {
  id: string
  eventId: string
  fromUserId: string
  toUserId: string
  amount: number
  status: string
  paidAt: Date | null
  confirmedAt: Date | null
  confirmedBy: string | null
  createdAt: Date
}

type CrewMember = {
  id: string
  name: string | null
  image: string | null
}

type ActivityResult = {
  id: string
  userId: string
  metric: string
  value: string
  unit: string | null
  day: Date | null
  createdAt: Date
}

type AwardDef = {
  id: string
  name: string
  label: string
  type: string
}

type Award = {
  id: string
  awardDefinitionId: string
  winnerId: string
}

type AwardVote = {
  id: string
  awardDefinitionId: string
  voterId: string
  nomineeId: string
}

type ItineraryDay = {
  id: string
  day: Date
  themeName: string | null
  notes: string | null
}

type Event = {
  id: string
  location: string | null
  mountains: string | null
  year: number
  startDate: Date | null
  endDate: Date | null
}

// ─── Itinerary Section ───────────────────────────────────────────────────────

export function ItinerarySection({
  event,
  itineraryList,
  canEdit,
  ritualSlug,
}: {
  event: Event
  itineraryList: ItineraryDay[]
  canEdit: boolean
  ritualSlug: string
}) {
  const [addingForDate, setAddingForDate] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [themeName, setThemeName] = useState('')
  const [notes, setNotes] = useState('')
  const [pending, startTransition] = useTransition()

  // Format date to YYYY-MM-DD in UTC (avoids timezone shift)
  function toDateStr(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  }

  const fmtDay = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })

  // Generate day slots from event date range
  const dateSlots: Date[] = []
  if (event.startDate && event.endDate) {
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateSlots.push(new Date(d))
    }
  }

  // Group existing itinerary entries by UTC date string
  const entriesByDate = new Map<string, ItineraryDay[]>()
  for (const item of itineraryList) {
    const key = toDateStr(new Date(item.day))
    const group = entriesByDate.get(key) ?? []
    group.push({ ...item, day: new Date(item.day) })
    entriesByDate.set(key, group)
  }

  // Collect all unique date strings (from range + existing entries)
  const allDateStrs = new Set([
    ...dateSlots.map((d) => toDateStr(d)),
    ...Array.from(entriesByDate.keys()),
  ])
  const sortedDateStrs = Array.from(allDateStrs).sort()

  // Map date strings to Date objects for display
  const dateObjMap = new Map<string, Date>()
  for (const d of dateSlots) dateObjMap.set(toDateStr(d), d)
  for (const item of itineraryList) {
    const d = new Date(item.day)
    const key = toDateStr(d)
    if (!dateObjMap.has(key)) dateObjMap.set(key, d)
  }

  if (sortedDateStrs.length === 0 && !canEdit) return null

  function handleClickAdd(dateStr: string) {
    setAddingForDate(dateStr)
    setThemeName('')
    setNotes('')
    setEditingId(null)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addingForDate) return
    startTransition(async () => {
      await addItineraryDay(
        event.id, ritualSlug, event.year,
        new Date(addingForDate),
        themeName || undefined,
        notes || undefined
      )
      setThemeName('')
      setNotes('')
      setAddingForDate(null)
    })
  }

  function handleUpdate(id: string) {
    startTransition(async () => {
      await updateItineraryDay(id, ritualSlug, event.year, themeName || undefined, notes || undefined)
      setEditingId(null)
      setThemeName('')
      setNotes('')
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteItineraryDay(id, ritualSlug, event.year)
    })
  }

  function startEdit(item: ItineraryDay) {
    setEditingId(item.id)
    setThemeName(item.themeName ?? '')
    setNotes(item.notes ?? '')
    setAddingForDate(null)
  }

  const inlineAddForm = (dateStr: string) => (
    <form
      key={dateStr + '-add'}
      onSubmit={handleAdd}
      className="flex flex-col gap-2 p-3 rounded-xl border border-dashed border-[var(--accent)] bg-[var(--surface)]"
    >
      <p className="text-xs text-[var(--fg-muted)]">{fmtDay(dateObjMap.get(dateStr)!)}</p>
      <input
        value={themeName}
        onChange={(e) => setThemeName(e.target.value)}
        placeholder="Activity (eg. Jersey Day, Prom Night)"
        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
      />
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-1.5 rounded-lg btn-accent text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Add Itinerary
        </button>
        <button
          type="button"
          onClick={() => setAddingForDate(null)}
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--fg-muted)]"
        >
          Cancel
        </button>
      </div>
    </form>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {sortedDateStrs.map((dateStr) => {
          const entries = entriesByDate.get(dateStr) ?? []
          const dateObj = dateObjMap.get(dateStr)!
          const isAdding = addingForDate === dateStr

          // No entries — placeholder or inline add form
          if (entries.length === 0) {
            if (isAdding) return inlineAddForm(dateStr)
            return (
              <button
                key={dateStr}
                onClick={() => canEdit && handleClickAdd(dateStr)}
                disabled={!canEdit}
                className={`flex items-center gap-3 p-3 rounded-xl border border-dashed border-[var(--border)] ${
                  canEdit ? 'hover:border-[var(--fg-muted)] cursor-pointer' : 'cursor-default'
                } transition-colors`}
              >
                <Calendar size={14} className="text-[var(--fg-muted)] shrink-0" />
                <span className="text-sm text-[var(--fg-muted)]">{fmtDay(dateObj)}</span>
                {canEdit && (
                  <Plus size={12} className="text-[var(--fg-muted)] ml-auto" />
                )}
              </button>
            )
          }

          // Has entries for this date
          return (
            <div key={dateStr} className="flex flex-col gap-1">
              {entries.map((item) => {
                if (editingId === item.id) {
                  return (
                    <div key={item.id} className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--accent)] bg-[var(--surface)]">
                      <p className="text-xs text-[var(--fg-muted)]">{fmtDay(item.day)}</p>
                      <input
                        value={themeName}
                        onChange={(e) => setThemeName(e.target.value)}
                        placeholder="Activity (eg. Jersey Day, Prom Night)"
                        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
                      />
                      <input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notes"
                        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(item.id)}
                          disabled={pending}
                          className="px-3 py-1.5 rounded-lg btn-accent text-xs font-semibold disabled:opacity-50"
                        >
                          {pending ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setThemeName(''); setNotes('') }}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--fg-muted)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                  >
                    <Calendar size={14} className="text-[var(--accent)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--fg)]">
                        <span className="text-[var(--fg-muted)]">{fmtDay(item.day)}</span>
                        {item.themeName && <span className="font-semibold"> — {item.themeName}</span>}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-[var(--fg-muted)] mt-0.5">{item.notes}</p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleClickAdd(dateStr)}
                          className="p-1 text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={pending}
                          className="p-1 text-[var(--fg-muted)] hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
              {isAdding && inlineAddForm(dateStr)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

const SKI_METRICS = ['fastest_speed', 'skier_cross_wins', 'vertical_feet']

function StatsTab({
  event,
  activityList,
  attendees,
  attendeeUsers,
  currentUserId,
  isSponsor,
  ritualSlug,
}: {
  event: Event
  activityList: ActivityResult[]
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  currentUserId: string
  isSponsor: boolean
  ritualSlug: string
}) {
  const [showForm, setShowForm] = useState(false)
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
        event.id,
        ritualSlug,
        event.year,
        userId,
        metric,
        value,
        unit.trim() || undefined,
        day ? new Date(day) : undefined
      )
      setMetric('')
      setValue('')
      setUnit('')
      setDay('')
      setShowForm(false)
    })
  }

  // Group by day
  const byDay = new Map<string, ActivityResult[]>()
  for (const r of activityList) {
    const key = r.day
      ? new Date(r.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'Undated'
    const group = byDay.get(key) ?? []
    group.push(r)
    byDay.set(key, group)
  }

  return (
    <div className="flex flex-col gap-4">
      {showForm ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Add Result</p>

          {isSponsor && (
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)]"
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
              list="metric-suggestions"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              placeholder="Metric (e.g. fastest_speed)"
              className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
            <datalist id="metric-suggestions">
              {SKI_METRICS.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>

          <div className="flex gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Value"
              className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unit"
              className="w-24 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
          </div>

          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)]"
          />

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending || !metric.trim() || !value.trim()}
              className="px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
            >
              {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
        >
          <Plus size={13} /> Add result
        </button>
      )}

      {activityList.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)] text-center py-4">No results yet.</p>
      ) : (
        Array.from(byDay.entries()).map(([dayKey, results]: [string, ActivityResult[]]) => (
          <div key={dayKey} className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">{dayKey}</p>
            {results.map((r) => {
              const user = userMap.get(r.userId)
              return (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                  <div>
                    <p className="text-sm text-[var(--fg)]">{r.metric.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-[var(--fg-muted)]">{user?.name?.split(' ')[0] ?? 'Unknown'}</p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--fg)]">
                    {r.value}{r.unit ? ` ${r.unit}` : ''}
                  </p>
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}

// ─── Arrival / Departure Board ────────────────────────────────────────────────

function ArrivalDepartureBoard({
  attendees,
  attendeeUsers,
}: {
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
}) {
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))

  const arrivals = attendees
    .filter((a) => a.arrivalFlightNumber)
    .sort((a, b) => {
      if (!a.arrivalDatetime) return 1
      if (!b.arrivalDatetime) return -1
      return new Date(a.arrivalDatetime).getTime() - new Date(b.arrivalDatetime).getTime()
    })

  const departures = attendees
    .filter((a) => a.departureFlightNumber)
    .sort((a, b) => {
      if (!a.departureDatetime) return 1
      if (!b.departureDatetime) return -1
      return new Date(a.departureDatetime).getTime() - new Date(b.departureDatetime).getTime()
    })

  if (arrivals.length === 0 && departures.length === 0) return null

  const fmtDatetime = (d: Date | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {arrivals.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Arrivals</p>
          {arrivals.map((a) => {
            const user = userMap.get(a.userId)
            return (
              <div key={a.id + '-arr'} className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--fg)]">
                    {user?.name?.split(' ')[0] ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-[var(--fg-muted)]">
                    {a.arrivalAirline} {a.arrivalFlightNumber}
                  </span>
                </div>
                <span className="text-xs text-[var(--fg-muted)]">
                  {fmtDatetime(a.arrivalDatetime)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {departures.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Departures</p>
          {departures.map((a) => {
            const user = userMap.get(a.userId)
            return (
              <div key={a.id + '-dep'} className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--fg)]">
                    {user?.name?.split(' ')[0] ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-[var(--fg-muted)]">
                    {a.departureAirline} {a.departureFlightNumber}
                  </span>
                </div>
                <span className="text-xs text-[var(--fg-muted)]">
                  {fmtDatetime(a.departureDatetime)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main In Progress View ────────────────────────────────────────────────────

export function InProgressView({
  event,
  attendees,
  attendeeUsers,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  myAttendee,
  expenseList,
  settlementPayments,
  loreList,
  activityList,
  awardDefs,
  currentAwards,
  awardVoteList,
  itineraryList,
  bookingList,
  crewMembers,
  currentUserId,
  canEdit,
  isSponsor = canEdit,
  ritualSlug,
  activityType,
  cachedTips,
  allRitualEvents,
}: {
  event: Event
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  myAttendee: Attendee | null
  expenseList: Expense[]
  settlementPayments: SettlementPayment[]
  loreList: LoreEntryData[]
  activityList: ActivityResult[]
  awardDefs: AwardDef[]
  currentAwards: Award[]
  awardVoteList: AwardVote[]
  itineraryList: ItineraryDay[]
  bookingList: EventBooking[]
  crewMembers: CrewMember[]
  currentUserId: string
  canEdit: boolean
  isSponsor?: boolean
  ritualSlug: string
  activityType: string
  cachedTips: string[] | null
  allRitualEvents?: { id: string; name: string; year: number }[]
}) {
  const [activeTab, setActiveTab] = useState<'lore' | 'stats' | 'expenses'>('lore')
  const [showCloseout, setShowCloseout] = useState(false)

  // Compute today's itinerary for carousel
  const todayStr = (() => {
    const now = new Date()
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
  })()
  const todayItinerary = itineraryList
    .filter((it) => {
      const d = new Date(it.day)
      const ds = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
      return ds === todayStr
    })
    .map((it) => ({ themeName: it.themeName, notes: it.notes }))

  const tabs = [
    { id: 'lore', label: 'Lore' },
    { id: 'stats', label: 'Stats' },
    { id: 'expenses', label: 'Expenses' },
  ] as const

  return (
    <div className="flex flex-col gap-6">
      {/* Event Details */}
      <EventDetailsCard
        event={{ ...event, status: 'in_progress' }}
        canEdit={canEdit}
        ritualSlug={ritualSlug}
        carouselProps={{
          activityType,
          attendees: attendees.map((a) => ({ userId: a.userId, bookingStatus: a.bookingStatus })),
          attendeeUsers: attendeeUsers.map((u) => ({ id: u.id, name: u.name })),
          loreCount: loreList.length,
          itineraryCount: itineraryList.length,
          cachedTips,
          todayItinerary: todayItinerary.length > 0 ? todayItinerary : null,
        }}
      />

      {/* Awards Podium */}
      <div className="rounded-xl border border-[var(--border)] border-l-4 border-l-amber-500 bg-[var(--surface)] p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Award size={14} className="text-amber-500" />
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Awards</p>
        </div>
        <AwardsPodium
          event={event}
          attendees={attendees}
          attendeeUsers={attendeeUsers}
          awardDefs={awardDefs}
          currentAwards={currentAwards}
          isSponsor={isSponsor}
          ritualSlug={ritualSlug}
        />
      </div>

      {/* Lodging & Transportation */}
      <div className="rounded-xl border border-[var(--border)] border-l-4 border-l-green-500 bg-[var(--surface)] p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Home size={14} className="text-green-500" />
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Lodging & Transportation</p>
        </div>
        <BookingsSection
          bookings={bookingList}
          eventId={event.id}
          canEdit={canEdit}
          ritualSlug={ritualSlug}
          year={event.year}
        />
      </div>

      {/* Flight Board */}
      {attendees.some(a => a.arrivalFlightNumber || a.departureFlightNumber) && (
        <div className="rounded-xl border border-[var(--border)] border-l-4 border-l-blue-500 bg-[var(--surface)] p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Plane size={14} className="text-blue-500" />
            <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Flight Board</p>
          </div>
          <ArrivalDepartureBoard
            attendees={attendees}
            attendeeUsers={attendeeUsers}
          />
        </div>
      )}

      {/* Itinerary */}
      <div className="rounded-xl border border-[var(--border)] border-l-4 border-l-purple-500 bg-[var(--surface)] p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-purple-500" />
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Itinerary</p>
        </div>
        <ItinerarySection
          event={event}
          itineraryList={itineraryList}
          canEdit={canEdit}
          ritualSlug={ritualSlug}
        />
      </div>

      {/* Lore / Stats / Expenses */}
      <div className="rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--accent)] bg-[var(--surface)] p-4 flex flex-col gap-4">
        {/* Tab switcher */}
        <div className="flex border-b border-[var(--border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-[var(--accent)] text-[var(--fg)]'
                  : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'lore' && (
          <LoreFeed
            entries={loreList}
            userMap={new Map(attendeeUsers.map((u) => [u.id, u]))}
            crewMembers={crewMembers}
            currentUserId={currentUserId}
            canEdit={canEdit}
            ritualSlug={ritualSlug}
            eventId={event.id}
            year={event.year}
            allowedTypes={['memory', 'checkin', 'image']}
            allEvents={allRitualEvents}
          />
        )}
        {activeTab === 'stats' && (
          <StatsTab
            event={event}
            activityList={activityList}
            attendees={attendees}
            attendeeUsers={attendeeUsers}
            currentUserId={currentUserId}
            isSponsor={isSponsor}
            ritualSlug={ritualSlug}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesTab
            event={event}
            expenseList={expenseList}
            settlementPayments={settlementPayments}
            attendees={attendees}
            attendeeUsers={attendeeUsers}
            currentUserId={currentUserId}
            canEdit={canEdit}
            ritualSlug={ritualSlug}
          />
        )}
      </div>

      {/* Close Out button (sponsor/organizer) */}
      {canEdit && (
        <button
          onClick={() => setShowCloseout(true)}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border border-[var(--border)] text-base font-semibold text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
        >
          Close Out
        </button>
      )}

      {/* Closeout overlay */}
      {showCloseout && (
        <CloseoutView
          event={event}
          attendees={attendees}
          attendeeUsers={attendeeUsers}
          expenseList={expenseList}
          settlementPayments={settlementPayments}
          awardDefs={awardDefs}
          currentAwards={currentAwards}
          awardVoteList={awardVoteList}
          currentUserId={currentUserId}
          isSponsor={isSponsor}
          ritualSlug={ritualSlug}
          onBack={() => setShowCloseout(false)}
        />
      )}
    </div>
  )
}
