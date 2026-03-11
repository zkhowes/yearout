'use client'

import { useState, useRef, useTransition } from 'react'
import { Calendar, User, Plus, Loader2, Play } from 'lucide-react'
import { AwardsPodium } from './awards-podium'
import {
  updateEventEdit,
  addEventAttendee,
  updateEventDetails,
} from '@/lib/event-actions'
import { getNationalityFlag } from '@/lib/flags'
import { LoreFeed as SharedLoreFeed } from '@/components/lore/lore-feed'
import type { LoreEntryData } from '@/components/lore/lore-post'
import { BookingsSection, type EventBooking } from '@/components/bookings-section'
import { InfoCarousel } from '@/components/info-carousel'

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
  nationality: string | null
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

type CrewMember = {
  id: string
  name: string | null
  image: string | null
}

type ItineraryDay = {
  id: string
  day: Date
  themeName: string | null
  notes: string | null
}

type MemberOverride = {
  userId: string
  photoOverride: string | null
  nicknameOverride: string | null
  nationalityOverride: string | null
  customFlagSvg: string | null
}

type RitualMember = {
  userId: string
  userName: string | null
  userImage: string | null
}

type Event = {
  id: string
  name: string
  location: string | null
  mountains: string | null
  year: number
  startDate: Date | null
  endDate: Date | null
  editUrl: string | null
  editThumbnailUrl: string | null
}

// ─── Video Embed Helpers ──────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  return match?.[1] ?? null
}

function getVimeoInfo(url: string): { id: string; hash?: string } | null {
  const match = url.match(/vimeo\.com\/(\d+)(?:\/([\w]+))?/)
  if (!match) return null
  return { id: match[1], hash: match[2] }
}

function getEmbedUrl(url: string): string | null {
  const ytId = getYouTubeId(url)
  if (ytId) return `https://www.youtube.com/embed/${ytId}`
  const vimeo = getVimeoInfo(url)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo.id}${vimeo.hash ? `?h=${vimeo.hash}` : ''}`
  return null
}

function getThumbnailUrl(url: string, customThumbnail: string | null): string | null {
  if (customThumbnail) return customThumbnail
  const ytId = getYouTubeId(url)
  if (ytId) return `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
  return null
}

// ─── ClosedView ───────────────────────────────────────────────────────────────

export function ClosedView({
  event,
  attendees,
  attendeeUsers,
  awardDefs,
  currentAwards,
  loreList,
  itineraryList,
  bookingList,
  memberOverrides,
  allRitualMembers,
  crewMembers,
  currentUserId,
  canEdit,
  ritualSlug,
  allRitualEvents,
}: {
  event: Event
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  awardDefs: AwardDef[]
  currentAwards: Award[]
  loreList: LoreEntryData[]
  itineraryList: ItineraryDay[]
  bookingList: EventBooking[]
  memberOverrides: MemberOverride[]
  allRitualMembers: RitualMember[]
  crewMembers: CrewMember[]
  currentUserId: string
  canEdit: boolean
  ritualSlug: string
  allRitualEvents?: { id: string; name: string; year: number }[]
}) {
  const overrideMap = new Map(memberOverrides.map((m) => [m.userId, m]))

  return (
    <div className="flex flex-col gap-8">
      {/* Event Details Card */}
      <EventDetailsCard event={event} canEdit={canEdit} ritualSlug={ritualSlug} />

      {/* Lodging & Transportation */}
      <BookingsSection
        bookings={bookingList}
        eventId={event.id}
        canEdit={canEdit}
        ritualSlug={ritualSlug}
        year={event.year}
      />

      {/* Daily Itinerary Recap */}
      {itineraryList.length > 0 && (
        <ItineraryRecap itineraryList={itineraryList} />
      )}

      {/* Awards Podium (exclude totem for archived events) */}
      {awardDefs.length > 0 && (
        <AwardsPodium
          event={event}
          attendees={attendees}
          attendeeUsers={attendeeUsers}
          awardDefs={awardDefs.filter((d) => d.type !== 'totem')}
          currentAwards={currentAwards}
          isSponsor={canEdit}
          ritualSlug={ritualSlug}
          overrideMap={overrideMap}
        />
      )}

      {/* Crew */}
      <CrewTiles
        event={event}
        attendees={attendees}
        attendeeUsers={attendeeUsers}
        overrideMap={overrideMap}
        allRitualMembers={allRitualMembers}
        canEdit={canEdit}
        ritualSlug={ritualSlug}
      />

      {/* 4e. Video Edit Section */}
      <VideoEditSection
        event={event}
        canEdit={canEdit}
        ritualSlug={ritualSlug}
      />

      {/* 4f. Lore Feed */}
      <SharedLoreFeed
        entries={loreList}
        userMap={new Map(attendeeUsers.map((u) => [u.id, u]))}
        crewMembers={crewMembers}
        currentUserId={currentUserId}
        canEdit={canEdit}
        ritualSlug={ritualSlug}
        eventId={event.id}
        year={event.year}
        allowedTypes={['memory', 'image']}
        allEvents={allRitualEvents}
      />
    </div>
  )
}

// ─── 4a. Event Details Card ──────────────────────────────────────────────────

export function EventDetailsCard({ event, canEdit, ritualSlug, carouselProps }: { event: { id: string; location: string | null; mountains: string | null; year: number; startDate: Date | null; endDate: Date | null; status?: string }; canEdit: boolean; ritualSlug: string; carouselProps?: { activityType: string; attendees: { userId: string; bookingStatus: string }[]; attendeeUsers: { id: string; name: string | null }[]; loreCount: number; itineraryCount: number; cachedTips: string[] | null; todayItinerary?: { themeName: string | null; notes: string | null }[] | null } }) {
  const [editing, setEditing] = useState(false)
  const [locationInput, setLocationInput] = useState(event.location ?? '')
  const [mountainsInput, setMountainsInput] = useState(event.mountains ?? '')
  const [startDateInput, setStartDateInput] = useState(event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '')
  const [endDateInput, setEndDateInput] = useState(event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : '')
  const [saving, startSave] = useTransition()

  const venues = event.mountains?.split(',').map((m) => m.trim()).filter(Boolean) ?? []
  const hasContent = venues.length > 0 || event.startDate || event.endDate || event.location

  function handleSave() {
    startSave(async () => {
      await updateEventDetails(event.id, ritualSlug, event.year, {
        location: locationInput,
        mountains: mountainsInput,
        startDate: startDateInput ? new Date(startDateInput) : null,
        endDate: endDateInput ? new Date(endDateInput) : null,
      })
      setEditing(false)
    })
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-3">
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Edit Details</p>
        <input
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
          placeholder="Location (e.g. South Lake Tahoe, CA)"
          className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
        />
        <input
          value={mountainsInput}
          onChange={(e) => setMountainsInput(e.target.value)}
          placeholder="Venues (comma-separated)"
          className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
        />
        <div className="flex gap-2">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">Start Date</label>
            <input
              type="date"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)]"
            />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">End Date</label>
            <input
              type="date"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
              className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)]"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
          </button>
          <button
            onClick={() => { setEditing(false); setLocationInput(event.location ?? ''); setMountainsInput(event.mountains ?? ''); setStartDateInput(event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : ''); setEndDateInput(event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : '') }}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--fg-muted)]"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (!hasContent && !canEdit) return null

  const showCarousel = carouselProps && (event.status === 'scheduled' || event.status === 'in_progress')
  const isLive = event.status === 'in_progress'

  return (
    <div
      className={`rounded-xl border p-5 flex flex-col md:flex-row gap-4 md:gap-6 ${
        isLive ? 'border-[var(--accent)]' : 'border-[var(--border)]'
      } bg-[var(--surface)]`}
      style={isLive ? { background: 'color-mix(in srgb, var(--accent) 8%, var(--surface))' } : undefined}
    >
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {isLive && (
          <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
            </span>
            Live
          </span>
        )}
        {event.location && (
          <p className="text-sm text-[var(--fg)]">{event.location}</p>
        )}
        {venues.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {venues.map((venue) => (
              <span
                key={venue}
                className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--border)] text-[var(--fg)]"
              >
                {venue}
              </span>
            ))}
          </div>
        )}
        {(event.startDate || event.endDate) && (
          <p className="text-sm text-[var(--fg-muted)]">
            {[event.startDate, event.endDate]
              .filter(Boolean)
              .map((d) =>
                d!.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC',
                })
              )
              .join(' \u2013 ')}
          </p>
        )}
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            className="self-start text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            {hasContent ? 'Edit details' : '+ Add location / venues'}
          </button>
        )}
      </div>
      {showCarousel && (
        <div className="md:flex-1 min-w-0">
          <InfoCarousel
            event={{ ...event, status: event.status ?? 'scheduled' }}
            activityType={carouselProps.activityType}
            attendees={carouselProps.attendees}
            attendeeUsers={carouselProps.attendeeUsers}
            loreCount={carouselProps.loreCount}
            itineraryCount={carouselProps.itineraryCount}
            cachedTips={carouselProps.cachedTips}
            ritualSlug={ritualSlug}
            todayItinerary={carouselProps.todayItinerary}
          />
        </div>
      )}
    </div>
  )
}

// ─── 4b. Daily Itinerary Recap ───────────────────────────────────────────────

function ItineraryRecap({ itineraryList }: { itineraryList: ItineraryDay[] }) {
  const sorted = [...itineraryList].sort(
    (a, b) => new Date(a.day).getTime() - new Date(b.day).getTime()
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Itinerary</p>
      <div className="flex flex-col gap-2">
        {sorted.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
          >
            <Calendar size={14} className="text-[var(--accent)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--fg)]">
                <span className="text-[var(--fg-muted)]">
                  {new Date(item.day).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })}
                </span>
                {item.themeName && (
                  <span className="font-semibold"> &mdash; {item.themeName}</span>
                )}
              </p>
              {item.notes && (
                <p className="text-xs text-[var(--fg-muted)] mt-0.5">{item.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Crew Tiles ──────────────────────────────────────────────────────────────

function CrewTiles({
  event,
  attendees,
  attendeeUsers,
  overrideMap,
  allRitualMembers,
  canEdit,
  ritualSlug,
}: {
  event: Event
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  overrideMap: Map<string, MemberOverride>
  allRitualMembers: RitualMember[]
  canEdit: boolean
  ritualSlug: string
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, startAdd] = useTransition()
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))
  const attendeeSet = new Set(attendees.map((a) => a.userId))
  const availableMembers = allRitualMembers.filter((m) => !attendeeSet.has(m.userId))

  function toggleSelect(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function handleAddSelected() {
    if (selected.size === 0) return
    startAdd(async () => {
      const userIds = Array.from(selected)
      for (const userId of userIds) {
        await addEventAttendee(event.id, ritualSlug, event.year, userId)
      }
      setSelected(new Set())
      setShowPicker(false)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Crew</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {attendees.map((a) => {
          const user = userMap.get(a.userId)
          if (!user) return null
          const override = overrideMap.get(a.userId)
          const photoUrl = override?.photoOverride ?? user.image
          const displayName = override?.nicknameOverride ?? user.name?.split(' ')[0] ?? 'Unknown'

          const flagUrl = getNationalityFlag(override?.nationalityOverride ?? user.nationality, override?.customFlagSvg)

          return (
            <div
              key={a.userId}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
            >
              <div className="relative">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--border)] flex items-center justify-center">
                    <User size={16} className="text-[var(--fg-muted)]" />
                  </div>
                )}
                {flagUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={flagUrl}
                    alt=""
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-3 rounded-sm object-cover border border-[var(--surface)]"
                  />
                )}
              </div>
              <span className="text-xs font-medium text-[var(--fg)] text-center leading-tight max-w-[72px] truncate">
                {displayName}
              </span>
              {a.isHost && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--accent)] opacity-80">Host</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Add crew member (sponsor/organizer) */}
      {canEdit && availableMembers.length > 0 && (
        showPicker ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 flex flex-col gap-2">
            <p className="text-xs text-[var(--fg-muted)]">Select crew members</p>
            <div className="flex flex-wrap gap-2">
              {availableMembers.map((m) => (
                <button
                  key={m.userId}
                  onClick={() => toggleSelect(m.userId)}
                  disabled={adding}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors disabled:opacity-50 ${
                    selected.has(m.userId)
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]'
                      : 'border-[var(--border)] text-[var(--fg)] hover:bg-[var(--border)]'
                  }`}
                >
                  {m.userName?.split(' ')[0] ?? 'Unknown'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddSelected}
                disabled={adding || selected.size === 0}
                className="px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
              >
                {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Add {selected.size > 0 ? `${selected.size} member${selected.size > 1 ? 's' : ''}` : ''}
              </button>
              <button
                onClick={() => { setShowPicker(false); setSelected(new Set()) }}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
          >
            <Plus size={12} /> Add crew member
          </button>
        )
      )}
    </div>
  )
}

// ─── 4e. Video Edit Section ──────────────────────────────────────────────────

function VideoEditSection({
  event,
  canEdit,
  ritualSlug,
}: {
  event: Event
  canEdit: boolean
  ritualSlug: string
}) {
  const [showEditForm, setShowEditForm] = useState(false)
  const [editUrlInput, setEditUrlInput] = useState(event.editUrl ?? '')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [pending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const thumbUrl = event.editUrl
    ? getThumbnailUrl(event.editUrl, event.editThumbnailUrl)
    : null

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      let thumbnailUrl = event.editThumbnailUrl ?? undefined

      if (thumbnailFile) {
        const formData = new FormData()
        formData.append('file', thumbnailFile)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (res.ok) {
          const { url } = await res.json()
          thumbnailUrl = url
        }
      } else if (!thumbnailUrl && editUrlInput.trim()) {
        // Auto-fetch thumbnail from video URL (works for Vimeo + YouTube)
        try {
          const res = await fetch(`/api/video-thumbnail?url=${encodeURIComponent(editUrlInput.trim())}`)
          if (res.ok) {
            const { thumbnailUrl: fetched } = await res.json()
            if (fetched) thumbnailUrl = fetched
          }
        } catch {
          // ignore — user can still upload a custom thumbnail
        }
      }

      await updateEventEdit(
        event.id,
        ritualSlug,
        event.year,
        editUrlInput,
        thumbnailUrl
      )
      setShowEditForm(false)
      setThumbnailFile(null)
    })
  }

  // No video and not editor — show nothing
  if (!event.editUrl && !canEdit) return null

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Video Edit</p>

      {event.editUrl && (() => {
        const embedUrl = getEmbedUrl(event.editUrl)
        return embedUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-[var(--border)] aspect-video w-full bg-black">
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <a
            href={event.editUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative rounded-xl overflow-hidden border border-[var(--border)] aspect-video w-full bg-black block"
          >
            {thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbUrl}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[var(--surface)]" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                <Play size={28} className="text-black ml-1" />
              </div>
            </div>
          </a>
        )
      })()}

      {canEdit && (
        showEditForm ? (
          <form onSubmit={handleSave} className="flex flex-col gap-3 p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
            <input
              value={editUrlInput}
              onChange={(e) => setEditUrlInput(e.target.value)}
              placeholder="YouTube or Vimeo URL"
              className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
              >
                {thumbnailFile ? thumbnailFile.name : 'Custom thumbnail (optional)'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending || !editUrlInput.trim()}
                className="px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
              >
                {pending ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setShowEditForm(false); setEditUrlInput(event.editUrl ?? ''); setThumbnailFile(null) }}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--fg-muted)]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowEditForm(true)}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
          >
            <Plus size={12} /> {event.editUrl ? 'Update video' : 'Add video edit'}
          </button>
        )
      )}
    </div>
  )
}

// Lore Feed moved to components/lore/lore-feed.tsx (SharedLoreFeed)
