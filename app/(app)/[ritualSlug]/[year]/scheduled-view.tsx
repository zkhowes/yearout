'use client'

import { useTransition } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { updateBookingStatus, advanceEventStatus } from '@/lib/event-actions'

type BookingStatus = 'not_yet' | 'committed' | 'flights_booked' | 'all_booked'

const STATUS_CYCLE: BookingStatus[] = ['not_yet', 'committed', 'flights_booked', 'all_booked']

const STATUS_LABELS: Record<BookingStatus, string> = {
  not_yet: 'Not Yet',
  committed: 'Committed',
  flights_booked: 'Flights',
  all_booked: 'All Booked',
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  not_yet: 'bg-[var(--surface)] border-[var(--border)] text-[var(--fg-muted)]',
  committed: 'bg-amber-400/20 border-amber-400/40 text-amber-600',
  flights_booked: 'bg-blue-400/20 border-blue-400/40 text-blue-600',
  all_booked: 'bg-green-400/20 border-green-400/40 text-green-600',
}

type Attendee = {
  id: string
  userId: string
  bookingStatus: BookingStatus
}

type AttendeeUser = {
  id: string
  name: string | null
  image: string | null
}

type Event = {
  id: string
  location: string | null
  mountains: string | null
  startDate: Date | null
  endDate: Date | null
  year: number
}

function formatDateRange(start: Date | null, end: Date | null): string | null {
  if (!start && !end) return null
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (start && end) {
    return start.getMonth() === end.getMonth()
      ? `${fmt(start)}–${end.getDate()}, ${end.getFullYear()}`
      : `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`
  }
  return start ? fmt(start) : end ? fmt(end!) : null
}

function BookingChip({
  attendee,
  user,
  isCurrentUser,
  eventId,
  ritualSlug,
  year,
}: {
  attendee: Attendee
  user: AttendeeUser
  isCurrentUser: boolean
  eventId: string
  ritualSlug: string
  year: number
}) {
  const [pending, startTransition] = useTransition()
  const status = attendee.bookingStatus

  function cycleStatus() {
    if (!isCurrentUser) return
    const nextIndex = (STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length
    const nextStatus = STATUS_CYCLE[nextIndex]
    startTransition(async () => {
      await updateBookingStatus(eventId, ritualSlug, year, nextStatus)
    })
  }

  return (
    <button
      onClick={cycleStatus}
      disabled={!isCurrentUser || pending}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${STATUS_COLORS[status]} ${
        isCurrentUser ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default'
      } disabled:opacity-60`}
    >
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt={user.name ?? ''}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-[var(--border)] flex items-center justify-center text-sm font-semibold text-[var(--fg-muted)]">
          {(user.name ?? '?').charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-xs font-medium text-center leading-tight max-w-[72px] truncate">
        {user.name?.split(' ')[0] ?? 'Unknown'}
      </span>
      {pending ? (
        <Loader2 size={10} className="animate-spin" />
      ) : (
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
          {STATUS_LABELS[status]}
        </span>
      )}
    </button>
  )
}

export function ScheduledView({
  event,
  attendees,
  attendeeUsers,
  myAttendee,
  isSponsor,
  ritualSlug,
}: {
  event: Event
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  myAttendee: Attendee | null
  isSponsor: boolean
  ritualSlug: string
}) {
  const [advancing, startAdvance] = useTransition()

  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))
  const dateRange = formatDateRange(event.startDate, event.endDate)
  const flightsUrl = `https://www.google.com/travel/flights?q=flights+to+${encodeURIComponent(event.location ?? '')}`

  function handleAdvance() {
    startAdvance(async () => {
      await advanceEventStatus(event.id, 'in_progress', ritualSlug, event.year)
    })
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Details card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-2">
        {event.location && (
          <p className="text-xl font-bold text-[var(--fg)]">{event.location}</p>
        )}
        {event.mountains && (
          <p className="text-sm text-[var(--fg-muted)]">{event.mountains}</p>
        )}
        {dateRange && (
          <p className="text-sm text-[var(--fg-muted)]">{dateRange}</p>
        )}
      </div>

      {/* Google Flights link */}
      {event.location && (
        <a
          href={flightsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-[var(--accent)] hover:opacity-70 transition-opacity"
        >
          <ExternalLink size={14} />
          Search flights to {event.location}
        </a>
      )}

      {/* Commitment Board */}
      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Commitment Board</p>
        {attendees.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No attendees yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {attendees.map((attendee) => {
              const user = userMap.get(attendee.userId)
              if (!user) return null
              return (
                <BookingChip
                  key={attendee.id}
                  attendee={attendee}
                  user={user}
                  isCurrentUser={attendee.userId === myAttendee?.userId}
                  eventId={event.id}
                  ritualSlug={ritualSlug}
                  year={event.year}
                />
              )
            })}
          </div>
        )}
        <p className="text-xs text-[var(--fg-muted)]">
          Tap your chip to cycle through booking status.
        </p>
      </div>

      {/* Start event (sponsor only) */}
      {isSponsor && (
        <button
          onClick={handleAdvance}
          disabled={advancing}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl btn-accent text-base font-semibold disabled:opacity-50"
        >
          {advancing ? (
            <><Loader2 size={16} className="animate-spin" /> Starting…</>
          ) : (
            'Start the event'
          )}
        </button>
      )}
    </div>
  )
}
