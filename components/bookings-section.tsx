'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Loader2, ExternalLink } from 'lucide-react'
import { addEventBooking, updateEventBooking, deleteEventBooking } from '@/lib/event-actions'

export type EventBooking = {
  id: string
  type: string
  name: string
  link: string | null
  note: string | null
  startDate: Date | null
  endDate: Date | null
}

function fmtDateRange(start: Date | null, end: Date | null): string | null {
  if (!start) return null
  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (!end || start.getTime() === end.getTime()) return fmt(start)
  return `${fmt(start)} – ${fmt(end)}`
}

function toDateInput(d: Date | null): string {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

function BookingEntry({
  booking,
  canEdit,
  ritualSlug,
  year,
}: {
  booking: EventBooking
  canEdit: boolean
  ritualSlug: string
  year: number
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(booking.name)
  const [link, setLink] = useState(booking.link ?? '')
  const [note, setNote] = useState(booking.note ?? '')
  const [startDate, setStartDate] = useState(toDateInput(booking.startDate))
  const [endDate, setEndDate] = useState(toDateInput(booking.endDate))
  const [saving, startSave] = useTransition()
  const [deleting, startDelete] = useTransition()

  function handleSave() {
    startSave(async () => {
      await updateEventBooking(
        booking.id,
        ritualSlug,
        year,
        name,
        link,
        note,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      )
      setEditing(false)
    })
  }

  function handleDelete() {
    startDelete(async () => {
      await deleteEventBooking(booking.id, ritualSlug, year)
    })
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 p-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g. AirBnb, Van)"
          className="bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
        />
        {booking.type === 'lodging' ? (
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Link (optional)"
            className="bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
          />
        ) : (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
          />
        )}
        <div className="flex gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)]"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)]"
          />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-3 py-2 rounded-lg btn-accent text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : 'Save'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-2 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const dateRange = fmtDateRange(booking.startDate, booking.endDate)

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--border)] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--fg)]">{booking.name}</span>
          {booking.link && (
            <a
              href={booking.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:opacity-70"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
        {booking.note && (
          <p className="text-xs text-[var(--fg-muted)]">{booking.note}</p>
        )}
      </div>
      {dateRange && (
        <span className="text-xs text-[var(--fg-muted)] shrink-0">{dateRange}</span>
      )}
      {canEdit && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-[var(--fg-muted)] hover:text-red-400 disabled:opacity-50"
          >
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
        </div>
      )}
    </div>
  )
}

function AddBookingForm({
  eventId,
  ritualSlug,
  year,
  type,
  onClose,
}: {
  eventId: string
  ritualSlug: string
  year: number
  type: 'lodging' | 'transportation'
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, startSave] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    startSave(async () => {
      await addEventBooking(
        eventId,
        ritualSlug,
        year,
        type,
        name,
        link || undefined,
        note || undefined,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      )
      setName('')
      setLink('')
      setNote('')
      setStartDate('')
      setEndDate('')
      onClose()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)]">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={type === 'lodging' ? 'Name (e.g. AirBnb)' : 'Name (e.g. Van, Rental Car)'}
        className="bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
        autoFocus
      />
      {type === 'lodging' ? (
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link (optional)"
          className="bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
        />
      ) : (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
        />
      )}
      <div className="flex gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)]"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)]"
        />
      </div>
      <div className="flex items-center gap-2 mt-1">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-3 py-2 rounded-lg btn-accent text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : 'Add'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export function BookingsSection({
  bookings,
  eventId,
  canEdit,
  ritualSlug,
  year,
}: {
  bookings: EventBooking[]
  eventId: string
  canEdit: boolean
  ritualSlug: string
  year: number
}) {
  const [addingType, setAddingType] = useState<'lodging' | 'transportation' | null>(null)

  const lodging = bookings.filter((b) => b.type === 'lodging')
  const transportation = bookings.filter((b) => b.type === 'transportation')

  if (lodging.length === 0 && transportation.length === 0 && !canEdit) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Lodging */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Lodging</p>
          {canEdit && (
            <button
              onClick={() => setAddingType(addingType === 'lodging' ? null : 'lodging')}
              className="p-2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
        {lodging.length === 0 && !addingType && (
          <p className="text-xs text-[var(--fg-muted)] italic">No lodging added yet</p>
        )}
        {lodging.map((b) => (
          <BookingEntry key={b.id} booking={b} canEdit={canEdit} ritualSlug={ritualSlug} year={year} />
        ))}
        {addingType === 'lodging' && (
          <AddBookingForm
            eventId={eventId}
            ritualSlug={ritualSlug}
            year={year}
            type="lodging"
            onClose={() => setAddingType(null)}
          />
        )}
      </div>

      {/* Transportation */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Transportation</p>
          {canEdit && (
            <button
              onClick={() => setAddingType(addingType === 'transportation' ? null : 'transportation')}
              className="p-2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
        {transportation.length === 0 && addingType !== 'transportation' && (
          <p className="text-xs text-[var(--fg-muted)] italic">No transportation added yet</p>
        )}
        {transportation.map((b) => (
          <BookingEntry key={b.id} booking={b} canEdit={canEdit} ritualSlug={ritualSlug} year={year} />
        ))}
        {addingType === 'transportation' && (
          <AddBookingForm
            eventId={eventId}
            ritualSlug={ritualSlug}
            year={year}
            type="transportation"
            onClose={() => setAddingType(null)}
          />
        )}
      </div>
    </div>
  )
}
