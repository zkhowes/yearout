'use client'

import { useState, useRef, useTransition } from 'react'
import { Calendar, User, Star, Plus, Loader2, Trash2, Play } from 'lucide-react'
import { AwardsPodium } from './awards-podium'
import {
  addLoreEntry,
  toggleLoreHOF,
  deleteLoreEntry,
  updateEventEdit,
} from '@/lib/event-actions'

type Attendee = {
  id: string
  userId: string
  bookingStatus: string
}

type AttendeeUser = {
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

type Award = {
  id: string
  awardDefinitionId: string
  winnerId: string
}

type LoreEntry = {
  id: string
  authorId: string
  type: 'memory' | 'checkin' | 'image'
  content: string | null
  mediaUrl: string | null
  location: string | null
  isHallOfFame: boolean
  day: Date | null
  createdAt: Date
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

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/)
  return match?.[1] ?? null
}

function getEmbedUrl(url: string): string | null {
  const ytId = getYouTubeId(url)
  if (ytId) return `https://www.youtube.com/embed/${ytId}`
  const vimeoId = getVimeoId(url)
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`
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
  memberOverrides,
  currentUserId,
  canEdit,
  ritualSlug,
}: {
  event: Event
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  awardDefs: AwardDef[]
  currentAwards: Award[]
  loreList: LoreEntry[]
  itineraryList: ItineraryDay[]
  memberOverrides: MemberOverride[]
  currentUserId: string
  canEdit: boolean
  ritualSlug: string
}) {
  const overrideMap = new Map(memberOverrides.map((m) => [m.userId, m]))

  return (
    <div className="flex flex-col gap-8">
      {/* 4a. Event Details Card */}
      <EventDetailsCard event={event} />

      {/* 4b. Daily Itinerary Recap */}
      {itineraryList.length > 0 && (
        <ItineraryRecap itineraryList={itineraryList} />
      )}

      {/* 4c. Awards Podium */}
      {awardDefs.length > 0 && (
        <AwardsPodium
          event={event}
          attendees={attendees}
          attendeeUsers={attendeeUsers}
          awardDefs={awardDefs}
          currentAwards={currentAwards}
          isSponsor={canEdit}
          ritualSlug={ritualSlug}
        />
      )}

      {/* 4d. Crew Roster */}
      {attendees.length > 0 && (
        <CrewRoster
          attendees={attendees}
          attendeeUsers={attendeeUsers}
          overrideMap={overrideMap}
        />
      )}

      {/* 4e. Video Edit Section */}
      <VideoEditSection
        event={event}
        canEdit={canEdit}
        ritualSlug={ritualSlug}
      />

      {/* 4f. Lore Feed */}
      <LoreFeed
        event={event}
        loreList={loreList}
        attendeeUsers={attendeeUsers}
        currentUserId={currentUserId}
        canEdit={canEdit}
        ritualSlug={ritualSlug}
      />
    </div>
  )
}

// ─── 4a. Event Details Card ──────────────────────────────────────────────────

function EventDetailsCard({ event }: { event: Event }) {
  const venues = event.mountains?.split(',').map((m) => m.trim()).filter(Boolean) ?? []

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-3">
      {event.location && (
        <p className="text-xl font-bold text-[var(--fg)]">{event.location}</p>
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
              })
            )
            .join(' \u2013 ')}
        </p>
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

// ─── 4d. Crew Roster ─────────────────────────────────────────────────────────

function CrewRoster({
  attendees,
  attendeeUsers,
  overrideMap,
}: {
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  overrideMap: Map<string, MemberOverride>
}) {
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Crew</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {attendees.map((a) => {
          const user = userMap.get(a.userId)
          if (!user) return null
          const override = overrideMap.get(a.userId)
          const photoUrl = override?.photoOverride ?? user.image
          const displayName = override?.nicknameOverride ?? user.name?.split(' ')[0] ?? 'Unknown'

          return (
            <div key={a.userId} className="flex flex-col items-center gap-2">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={displayName}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[var(--border)] flex items-center justify-center">
                  <User size={24} className="text-[var(--fg-muted)]" />
                </div>
              )}
              <p className="text-xs font-medium text-[var(--fg)] text-center">{displayName}</p>
            </div>
          )
        })}
      </div>
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
  const [playing, setPlaying] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editUrlInput, setEditUrlInput] = useState(event.editUrl ?? '')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [pending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const embedUrl = event.editUrl ? getEmbedUrl(event.editUrl) : null
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

      {event.editUrl && embedUrl && !playing && (
        <button
          onClick={() => setPlaying(true)}
          className="relative rounded-xl overflow-hidden border border-[var(--border)] aspect-video w-full bg-black"
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
        </button>
      )}

      {playing && embedUrl && (
        <div className="rounded-xl overflow-hidden border border-[var(--border)] aspect-video w-full">
          <iframe
            src={`${embedUrl}?autoplay=1`}
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      )}

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

// ─── 4f. Lore Feed ───────────────────────────────────────────────────────────

function LoreFeed({
  event,
  loreList,
  attendeeUsers,
  currentUserId,
  canEdit,
  ritualSlug,
}: {
  event: Event
  loreList: LoreEntry[]
  attendeeUsers: AttendeeUser[]
  currentUserId: string
  canEdit: boolean
  ritualSlug: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<'memory' | 'image'>('memory')
  const [content, setContent] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [pending, startSubmit] = useTransition()
  const [toggling, startToggle] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, startDelete] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))

  const sorted = [...loreList].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    startSubmit(async () => {
      let mediaUrl: string | undefined
      if (type === 'image' && photoFile) {
        const formData = new FormData()
        formData.append('file', photoFile)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (res.ok) {
          const { url } = await res.json()
          mediaUrl = url
        }
      }

      await addLoreEntry(
        event.id,
        ritualSlug,
        event.year,
        type,
        content,
        undefined,
        undefined,
        mediaUrl
      )
      setContent('')
      setPhotoFile(null)
      setShowForm(false)
    })
  }

  function handleToggleHOF(entryId: string) {
    startToggle(async () => {
      await toggleLoreHOF(entryId, ritualSlug, event.year)
    })
  }

  function handleDelete(entryId: string) {
    setDeletingId(entryId)
    startDelete(async () => {
      await deleteLoreEntry(entryId, ritualSlug, event.year)
      setDeletingId(null)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Lore</p>

      {/* Add lore form — available to all crew on closed events */}
      {showForm ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">New Entry</p>

          <div className="flex gap-2">
            {(['memory', 'image'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-1 rounded-lg text-xs border transition-all capitalize ${
                  type === t
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                    : 'border-[var(--border)] text-[var(--fg-muted)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 200))}
              placeholder="What happened?"
              rows={3}
              maxLength={200}
              className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] resize-none"
            />
            <span className="absolute bottom-1 right-0 text-[10px] text-[var(--fg-muted)]">
              {content.length}/200
            </span>
          </div>

          {type === 'image' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
              >
                {photoFile ? photoFile.name : 'Choose photo'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending || !content.trim()}
              className="px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
            >
              {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setContent(''); setPhotoFile(null) }}
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
          <Plus size={13} /> Add lore
        </button>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)] text-center py-4">No lore yet. Be the first to add a memory.</p>
      ) : (
        sorted.map((entry) => {
          const author = userMap.get(entry.authorId)
          const canToggleHOF = entry.authorId === currentUserId || canEdit
          const canDeleteEntry = entry.authorId === currentUserId || canEdit

          return (
            <div
              key={entry.id}
              className={`flex flex-col gap-2 p-4 rounded-xl border bg-[var(--surface)] ${
                entry.isHallOfFame
                  ? 'border-[var(--accent)]'
                  : 'border-[var(--border)]'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Author avatar */}
                {author?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={author.image}
                    alt={author.name ?? ''}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--border)] flex items-center justify-center shrink-0">
                    <User size={14} className="text-[var(--fg-muted)]" />
                  </div>
                )}

                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--fg)]">
                      {author?.name?.split(' ')[0] ?? 'Unknown'}
                    </span>
                    {entry.isHallOfFame && (
                      <Star size={12} className="text-[var(--accent)] fill-current" />
                    )}
                  </div>
                  <p className="text-sm text-[var(--fg)]">{entry.content}</p>
                  {entry.mediaUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.mediaUrl}
                      alt="Lore photo"
                      className="rounded-lg mt-2 max-w-full max-h-64 object-cover"
                    />
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {canToggleHOF && (
                    <button
                      onClick={() => handleToggleHOF(entry.id)}
                      disabled={toggling}
                      className={`p-1 rounded transition-colors disabled:opacity-50 ${
                        entry.isHallOfFame
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--border)] hover:text-[var(--fg-muted)]'
                      }`}
                      aria-label="Toggle Hall of Fame"
                    >
                      <Star size={14} className={entry.isHallOfFame ? 'fill-current' : ''} />
                    </button>
                  )}
                  {canDeleteEntry && (
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleting && deletingId === entry.id}
                      className="p-1 text-[var(--fg-muted)] hover:text-red-400 transition-colors disabled:opacity-50"
                      aria-label="Delete entry"
                    >
                      {deleting && deletingId === entry.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
