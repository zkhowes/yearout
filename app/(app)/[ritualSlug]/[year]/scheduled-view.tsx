'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Loader2, Plane, ChevronDown, ChevronUp, Settings, Users, Home, Calendar } from 'lucide-react'
import { updateBookingStatus, updateBookingStatusForUser, advanceEventStatus, updateFlightDetails, updateFlightDetailsForUser, toggleHostStatus } from '@/lib/event-actions'
import { ItinerarySection } from './in-progress-view'
import { ExpensesTab } from '@/components/expenses-tab'
import { EventDetailsCard } from './closed-view'
import { LoreFeed } from '@/components/lore/lore-feed'
import type { LoreEntryData } from '@/components/lore/lore-post'
import { BookingsSection, type EventBooking } from '@/components/bookings-section'

type BookingStatus = 'not_yet' | 'committed' | 'flights_booked' | 'all_booked' | 'out'

const STATUS_CYCLE: BookingStatus[] = ['not_yet', 'committed', 'flights_booked', 'all_booked', 'out']

const STATUS_LABELS: Record<BookingStatus, string> = {
  not_yet: 'Not Yet',
  committed: 'Committed',
  flights_booked: 'Booking Travel',
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
}

type Event = {
  id: string
  location: string | null
  mountains: string | null
  startDate: Date | null
  endDate: Date | null
  year: number
}

function BookingChip({
  attendee,
  user,
  isCurrentUser,
  canEdit,
  eventId,
  ritualSlug,
  year,
  onSelect,
  isSelected,
}: {
  attendee: Attendee
  user: AttendeeUser
  isCurrentUser: boolean
  canEdit: boolean
  eventId: string
  ritualSlug: string
  year: number
  onSelect?: () => void
  isSelected?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const status = attendee.bookingStatus
  const canInteract = isCurrentUser || canEdit

  function cycleStatus() {
    if (!canInteract) return
    const nextIndex = (STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length
    const nextStatus = STATUS_CYCLE[nextIndex]
    startTransition(async () => {
      if (isCurrentUser) {
        await updateBookingStatus(eventId, ritualSlug, year, nextStatus)
      } else {
        await updateBookingStatusForUser(eventId, ritualSlug, year, attendee.userId, nextStatus)
      }
    })
  }

  function handleClick() {
    if (canEdit && !isCurrentUser && onSelect) {
      onSelect()
    } else {
      cycleStatus()
    }
  }

  const isOut = status === 'out'

  return (
    <button
      onClick={handleClick}
      disabled={!canInteract || pending}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${STATUS_COLORS[status]} ${
        canInteract ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default'
      } ${isSelected ? 'ring-2 ring-[var(--accent)]' : ''} disabled:opacity-60`}
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
      {attendee.isHost && (
        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--accent)] opacity-80">Host</span>
      )}
      {pending ? (
        <Loader2 size={10} className="animate-spin" />
      ) : (
        <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
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
  isCurrentUser = true,
}: {
  attendee: Attendee
  eventId: string
  ritualSlug: string
  year: number
  isCurrentUser?: boolean
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
      const data = {
        arrivalAirline: arrAirline || undefined,
        arrivalFlightNumber: arrFlight || undefined,
        arrivalDatetime: arrDatetime ? new Date(arrDatetime) : null,
        departureAirline: depAirline || undefined,
        departureFlightNumber: depFlight || undefined,
        departureDatetime: depDatetime ? new Date(depDatetime) : null,
      }
      if (isCurrentUser) {
        await updateFlightDetails(eventId, ritualSlug, year, data)
      } else {
        await updateFlightDetailsForUser(eventId, ritualSlug, year, attendee.userId, data)
      }
      setExpanded(false)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-[var(--accent)] hover:opacity-70 transition-opacity"
      >
        <Plane size={14} />
        {hasFlightInfo ? 'Edit flight details' : 'Add flight details'}
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Arrival</p>
          <div className="flex gap-2">
            <input
              value={arrAirline}
              onChange={(e) => setArrAirline(e.target.value)}
              placeholder="Airline"
              className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
            <input
              value={arrFlight}
              onChange={(e) => setArrFlight(e.target.value)}
              placeholder="Flight #"
              className="w-24 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
          </div>
          <input
            type="datetime-local"
            value={arrDatetime}
            onChange={(e) => setArrDatetime(e.target.value)}
            className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)]"
          />

          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)] mt-2">Departure</p>
          <div className="flex gap-2">
            <input
              value={depAirline}
              onChange={(e) => setDepAirline(e.target.value)}
              placeholder="Airline"
              className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
            <input
              value={depFlight}
              onChange={(e) => setDepFlight(e.target.value)}
              placeholder="Flight #"
              className="w-24 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
          </div>
          <input
            type="datetime-local"
            value={depDatetime}
            onChange={(e) => setDepDatetime(e.target.value)}
            className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)]"
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
              <div key={a.id + '-arr'} className="flex items-center justify-between py-3 border-b border-[var(--border)]">
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
              <div key={a.id + '-dep'} className="flex items-center justify-between py-3 border-b border-[var(--border)]">
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

type CrewMember = {
  id: string
  name: string | null
  image: string | null
}

type Expense = {
  id: string
  paidBy: string
  description: string
  amount: number
  currency: string
  originalAmount: number | null
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

type ItineraryDay = {
  id: string
  day: Date
  themeName: string | null
  notes: string | null
}

function HostManager({
  eventId,
  attendees,
  attendeeUsers,
  ritualSlug,
  year,
}: {
  eventId: string
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  ritualSlug: string
  year: number
}) {
  const [toggling, startToggle] = useTransition()
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))

  function handleToggle(userId: string) {
    setTogglingId(userId)
    startToggle(async () => {
      await toggleHostStatus(eventId, ritualSlug, year, userId)
      setTogglingId(null)
    })
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Manage Hosts</p>
      {attendees.map((a) => {
        const user = userMap.get(a.userId)
        if (!user) return null
        const isToggling = toggling && togglingId === a.userId
        return (
          <div key={a.userId} className="flex items-center justify-between py-2">
            <span className="text-sm text-[var(--fg)]">{user.name?.split(' ')[0] ?? 'Unknown'}</span>
            <button
              onClick={() => handleToggle(a.userId)}
              disabled={toggling}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                a.isHost ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
              } disabled:opacity-50`}
            >
              {isToggling ? (
                <Loader2 size={12} className="absolute top-1 left-1/2 -translate-x-1/2 animate-spin text-[var(--fg-muted)]" />
              ) : (
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    a.isHost ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}

function MemberDetailPanel({
  attendee,
  user,
  eventId,
  ritualSlug,
  year,
  isSponsor,
  onClose,
}: {
  attendee: Attendee
  user: AttendeeUser
  eventId: string
  ritualSlug: string
  year: number
  isSponsor: boolean
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const status = attendee.bookingStatus

  function cycleStatus() {
    const nextIndex = (STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length
    const nextStatus = STATUS_CYCLE[nextIndex]
    startTransition(async () => {
      await updateBookingStatusForUser(eventId, ritualSlug, year, attendee.userId, nextStatus)
    })
  }

  const [togglingHost, startToggleHost] = useTransition()
  function handleToggleHost() {
    startToggleHost(async () => {
      await toggleHostStatus(eventId, ritualSlug, year, attendee.userId)
    })
  }

  return (
    <div className="rounded-xl border border-[var(--accent)] bg-[var(--surface)] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? ''} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--border)] flex items-center justify-center text-sm font-semibold text-[var(--fg-muted)]">
              {(user.name ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <p className="text-sm font-semibold text-[var(--fg)]">{user.name ?? 'Unknown'}</p>
        </div>
        <button onClick={onClose} className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]">Close</button>
      </div>

      {/* Status cycling */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--fg-muted)]">Status:</span>
        <button
          onClick={cycleStatus}
          disabled={pending}
          className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[status]} hover:opacity-80 transition-all disabled:opacity-50`}
        >
          {pending ? <Loader2 size={10} className="animate-spin inline" /> : STATUS_LABELS[status]}
        </button>
        <span className="text-xs text-[var(--fg-muted)]">Tap to cycle</span>
      </div>

      {/* Host toggle */}
      {isSponsor && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--fg-muted)]">Host:</span>
          <button
            onClick={handleToggleHost}
            disabled={togglingHost}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              attendee.isHost ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
            } disabled:opacity-50`}
          >
            {togglingHost ? (
              <Loader2 size={12} className="absolute top-1 left-1/2 -translate-x-1/2 animate-spin text-[var(--fg-muted)]" />
            ) : (
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  attendee.isHost ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            )}
          </button>
        </div>
      )}

      {/* Flight details */}
      <FlightDetailsForm
        attendee={attendee}
        eventId={eventId}
        ritualSlug={ritualSlug}
        year={year}
        isCurrentUser={false}
      />
    </div>
  )
}

export function ScheduledView({
  event,
  attendees,
  attendeeUsers,
  myAttendee,
  canEdit,
  isSponsor,
  itineraryList,
  bookingList,
  expenseList,
  settlementPayments,
  loreList,
  crewMembers,
  currentUserId,
  ritualSlug,
  activityType,
  cachedTips,
  allRitualEvents,
}: {
  event: Event
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  myAttendee: Attendee | null
  canEdit: boolean
  isSponsor: boolean
  itineraryList: ItineraryDay[]
  bookingList: EventBooking[]
  expenseList: Expense[]
  settlementPayments: SettlementPayment[]
  loreList: LoreEntryData[]
  crewMembers: CrewMember[]
  currentUserId: string
  ritualSlug: string
  activityType: string
  cachedTips: string[] | null
  allRitualEvents?: { id: string; name: string; year: number }[]
}) {
  const [advancing, startAdvance] = useTransition()
  const [activeTab, setActiveTab] = useState<'lore' | 'expenses'>('lore')
  const [showControls, setShowControls] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))
  const selectedAttendee = selectedMemberId ? attendees.find((a) => a.userId === selectedMemberId) : null
  const flightsUrl = `https://www.google.com/travel/flights?q=flights+to+${encodeURIComponent(event.location ?? '')}`

  function handleAdvance() {
    startAdvance(async () => {
      await advanceEventStatus(event.id, 'in_progress', ritualSlug, event.year)
    })
  }

  const tabs = [
    { id: 'lore', label: 'Lore' },
    { id: 'expenses', label: 'Expenses' },
  ] as const

  return (
    <div className="flex flex-col gap-6">

      {/* Details card */}
      <EventDetailsCard
        event={{ ...event, status: 'scheduled' }}
        canEdit={canEdit}
        ritualSlug={ritualSlug}
        carouselProps={{
          activityType,
          attendees: attendees.map((a) => ({ userId: a.userId, bookingStatus: a.bookingStatus })),
          attendeeUsers: attendeeUsers.map((u) => ({ id: u.id, name: u.name })),
          loreCount: loreList.length,
          itineraryCount: itineraryList.length,
          cachedTips,
        }}
      />

      {/* ── Commitment Board ── */}
      <div className="rounded-xl border border-[var(--border)] border-l-4 border-l-amber-500 bg-[var(--surface)] p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-amber-500" />
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Commitment Board</p>
        </div>
        {attendees.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No attendees yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {attendees.map((attendee) => {
              const user = userMap.get(attendee.userId)
              if (!user) return null
              const isSelf = attendee.userId === myAttendee?.userId
              return (
                <BookingChip
                  key={attendee.id}
                  attendee={attendee}
                  user={user}
                  isCurrentUser={isSelf}
                  canEdit={canEdit}
                  eventId={event.id}
                  ritualSlug={ritualSlug}
                  year={event.year}
                  isSelected={selectedMemberId === attendee.userId}
                  onSelect={() => setSelectedMemberId(
                    selectedMemberId === attendee.userId ? null : attendee.userId
                  )}
                />
              )
            })}
          </div>
        )}
        <p className="text-xs text-[var(--fg-muted)]">
          {canEdit ? 'Tap a chip to manage that member.' : 'Tap your chip to cycle through booking status.'}
        </p>

        {/* Member detail panel (inline within commitment card) */}
        {canEdit && selectedAttendee && (() => {
          const selectedUser = userMap.get(selectedAttendee.userId)
          return (
            <MemberDetailPanel
              attendee={selectedAttendee}
              user={selectedUser!}
              eventId={event.id}
              ritualSlug={ritualSlug}
              year={event.year}
              isSponsor={isSponsor}
              onClose={() => setSelectedMemberId(null)}
            />
          )
        })()}
      </div>

      {/* ── Travel ── */}
      <div className="rounded-xl border border-[var(--border)] border-l-4 border-l-blue-500 bg-[var(--surface)] p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Plane size={14} className="text-blue-500" />
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Travel</p>
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

        {/* Flight details form (current user, when flights booked) */}
        {!selectedMemberId && myAttendee && (myAttendee.bookingStatus === 'flights_booked' || myAttendee.bookingStatus === 'all_booked') && (
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
      </div>

      {/* ── Lodging & Transportation ── */}
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

      {/* ── Itinerary ── */}
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

      {/* ── Lore / Expenses ── */}
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

      {/* Sponsor Controls */}
      {canEdit && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowControls(!showControls)}
            className="flex items-center gap-2 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            <Settings size={14} />
            Sponsor Controls
            {showControls ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showControls && (
            <div className="flex flex-col gap-4">
              {/* Host management (sponsor-only) */}
              {isSponsor && (
                <HostManager
                  eventId={event.id}
                  attendees={attendees}
                  attendeeUsers={attendeeUsers}
                  ritualSlug={ritualSlug}
                  year={event.year}
                />
              )}

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
            </div>
          )}
        </div>
      )}
    </div>
  )
}
