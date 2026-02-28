'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Loader2, Plane, ChevronDown, ChevronUp } from 'lucide-react'
import { updateBookingStatus, advanceEventStatus, updateFlightDetails } from '@/lib/event-actions'

type BookingStatus = 'not_yet' | 'committed' | 'flights_booked' | 'all_booked' | 'out'

const STATUS_CYCLE: BookingStatus[] = ['not_yet', 'committed', 'flights_booked', 'all_booked', 'out']

const STATUS_LABELS: Record<BookingStatus, string> = {
  not_yet: 'Not Yet',
  committed: 'Committed',
  flights_booked: 'Flights',
  all_booked: 'All Booked',
  out: 'Out',
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  not_yet: 'bg-[var(--surface)] border-[var(--border)] text-[var(--fg-muted)]',
  committed: 'bg-amber-400/20 border-amber-400/40 text-amber-600',
  flights_booked: 'bg-blue-400/20 border-blue-400/40 text-blue-600',
  all_booked: 'bg-green-400/20 border-green-400/40 text-green-600',
  out: 'bg-red-400/10 border-red-400/30 text-red-400',
}

type Attendee = {
  id: string
  userId: string
  bookingStatus: BookingStatus
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

  const isOut = status === 'out'

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
          className={`w-10 h-10 rounded-full object-cover ${isOut ? 'opacity-40 grayscale' : ''}`}
        />
      ) : (
        <div className={`w-10 h-10 rounded-full bg-[var(--border)] flex items-center justify-center text-sm font-semibold text-[var(--fg-muted)] ${isOut ? 'opacity-40' : ''}`}>
          {(user.name ?? '?').charAt(0).toUpperCase()}
        </div>
      )}
      <span className={`text-xs font-medium text-center leading-tight max-w-[72px] truncate ${isOut ? 'line-through opacity-60' : ''}`}>
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

function FlightDetailsForm({
  attendee,
  eventId,
  ritualSlug,
  year,
}: {
  attendee: Attendee
  eventId: string
  ritualSlug: string
  year: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [saving, startSave] = useTransition()
  const [arrAirline, setArrAirline] = useState(attendee.arrivalAirline ?? '')
  const [arrFlight, setArrFlight] = useState(attendee.arrivalFlightNumber ?? '')
  const [arrDatetime, setArrDatetime] = useState(
    attendee.arrivalDatetime
      ? new Date(attendee.arrivalDatetime).toISOString().slice(0, 16)
      : ''
  )
  const [depAirline, setDepAirline] = useState(attendee.departureAirline ?? '')
  const [depFlight, setDepFlight] = useState(attendee.departureFlightNumber ?? '')
  const [depDatetime, setDepDatetime] = useState(
    attendee.departureDatetime
      ? new Date(attendee.departureDatetime).toISOString().slice(0, 16)
      : ''
  )

  const hasFlightInfo = attendee.arrivalFlightNumber || attendee.departureFlightNumber

  function handleSave() {
    startSave(async () => {
      await updateFlightDetails(eventId, ritualSlug, year, {
        arrivalAirline: arrAirline || undefined,
        arrivalFlightNumber: arrFlight || undefined,
        arrivalDatetime: arrDatetime ? new Date(arrDatetime) : null,
        departureAirline: depAirline || undefined,
        departureFlightNumber: depFlight || undefined,
        departureDatetime: depDatetime ? new Date(depDatetime) : null,
      })
      setExpanded(false)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-[var(--accent)] hover:opacity-70 transition-opacity"
      >
        <Plane size={12} />
        {hasFlightInfo ? 'Edit flight details' : 'Add flight details'}
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Arrival</p>
          <div className="flex gap-2">
            <input
              value={arrAirline}
              onChange={(e) => setArrAirline(e.target.value)}
              placeholder="Airline"
              className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
            <input
              value={arrFlight}
              onChange={(e) => setArrFlight(e.target.value)}
              placeholder="Flight #"
              className="w-24 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
          </div>
          <input
            type="datetime-local"
            value={arrDatetime}
            onChange={(e) => setArrDatetime(e.target.value)}
            className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)]"
          />

          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)] mt-2">Departure</p>
          <div className="flex gap-2">
            <input
              value={depAirline}
              onChange={(e) => setDepAirline(e.target.value)}
              placeholder="Airline"
              className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
            <input
              value={depFlight}
              onChange={(e) => setDepFlight(e.target.value)}
              placeholder="Flight #"
              className="w-24 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
          </div>
          <input
            type="datetime-local"
            value={depDatetime}
            onChange={(e) => setDepDatetime(e.target.value)}
            className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)]"
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="self-start px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50 flex items-center gap-1 mt-1"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}

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
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Flight Board</p>

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

      {/* Flight details form (when user has flights booked) */}
      {myAttendee && (myAttendee.bookingStatus === 'flights_booked' || myAttendee.bookingStatus === 'all_booked') && (
        <FlightDetailsForm
          attendee={myAttendee}
          eventId={event.id}
          ritualSlug={ritualSlug}
          year={event.year}
        />
      )}

      {/* Arrival/Departure Board */}
      <ArrivalDepartureBoard
        attendees={attendees}
        attendeeUsers={attendeeUsers}
      />

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
