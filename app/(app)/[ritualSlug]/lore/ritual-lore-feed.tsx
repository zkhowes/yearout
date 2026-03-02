'use client'

import { useState, useTransition } from 'react'
import { Plus, Star, Filter } from 'lucide-react'
import { toggleLoreHOF, deleteLoreEntry } from '@/lib/event-actions'
import { LorePost, type LoreEntryData } from '@/components/lore/lore-post'
import { AddLoreForm } from '@/components/lore/add-lore-form'

type EventSummary = {
  id: string
  name: string
  year: number
  status: string
}

type Member = {
  id: string
  name: string | null
  image: string | null
}

type RitualLoreFeedProps = {
  entries: LoreEntryData[]
  allMembers: Member[]
  allEvents: EventSummary[]
  currentUserId: string
  canEdit: boolean
  ritualSlug: string
}

export function RitualLoreFeed({
  entries,
  allMembers,
  allEvents,
  currentUserId,
  canEdit,
  ritualSlug,
}: RitualLoreFeedProps) {
  const [showForm, setShowForm] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [filterYear, setFilterYear] = useState<number | null>(null)
  const [filterUserId, setFilterUserId] = useState<string | null>(null)
  const [filterHOFOnly, setFilterHOFOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [toggling, startToggle] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, startDelete] = useTransition()

  const userMap = new Map(allMembers.map((m) => [m.id, m]))

  // Events available for adding lore (non-planning)
  const addableEvents = allEvents.filter((e) => e.status !== 'planning')
  const defaultEvent = addableEvents[0]

  // Get unique years for filter
  const years = Array.from(new Set(allEvents.map((e) => e.year))).sort((a, b) => b - a)

  // Get unique authors/mentioned in entries for filter
  const authorIds = Array.from(new Set(entries.map((e) => e.authorId)))
  const mentionedIds = Array.from(new Set(entries.flatMap((e) => e.mentions.map((m) => m.userId))))
  const filterableUsers = Array.from(new Set([...authorIds, ...mentionedIds]))
    .map((id) => userMap.get(id))
    .filter(Boolean) as Member[]

  // Apply filters
  let filtered = entries
  if (filterYear !== null) {
    filtered = filtered.filter((e) => e.eventYear === filterYear)
  }
  if (filterUserId !== null) {
    filtered = filtered.filter(
      (e) =>
        e.authorId === filterUserId ||
        e.mentions.some((m) => m.userId === filterUserId)
    )
  }
  if (filterHOFOnly) {
    filtered = filtered.filter((e) => e.isHallOfFame)
  }

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  function handleToggleHOF(entryId: string) {
    const entry = entries.find((e) => e.id === entryId)
    if (!entry) return
    startToggle(async () => {
      await toggleLoreHOF(entryId, ritualSlug, entry.eventYear ?? 0)
    })
  }

  function handleDelete(entryId: string) {
    const entry = entries.find((e) => e.id === entryId)
    if (!entry) return
    setDeletingId(entryId)
    startDelete(async () => {
      await deleteLoreEntry(entryId, ritualSlug, entry.eventYear ?? 0)
      setDeletingId(null)
    })
  }

  function handleOpenForm() {
    setSelectedEventId(defaultEvent?.id ?? '')
    setShowForm(true)
  }

  const selectedEvent = allEvents.find((e) => e.id === selectedEventId)
  const hasActiveFilters = filterYear !== null || filterUserId !== null || filterHOFOnly

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Lore</p>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 text-xs transition-colors ${
            hasActiveFilters ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
          }`}
        >
          <Filter size={12} />
          Filter
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {/* Year filter */}
          <select
            value={filterYear ?? ''}
            onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value) : null)}
            className="bg-transparent border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--fg)] outline-none"
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* User filter */}
          <select
            value={filterUserId ?? ''}
            onChange={(e) => setFilterUserId(e.target.value || null)}
            className="bg-transparent border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--fg)] outline-none"
          >
            <option value="">All crew</option>
            {filterableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name?.split(' ')[0] ?? 'Unknown'}
              </option>
            ))}
          </select>

          {/* HOF toggle */}
          <button
            onClick={() => setFilterHOFOnly(!filterHOFOnly)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-all ${
              filterHOFOnly
                ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                : 'border-[var(--border)] text-[var(--fg-muted)]'
            }`}
          >
            <Star size={10} className={filterHOFOnly ? 'fill-current' : ''} />
            HOF
          </button>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilterYear(null)
                setFilterUserId(null)
                setFilterHOFOnly(false)
              }}
              className="px-2 py-1 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Add lore form with event selector */}
      {showForm ? (
        <div className="flex flex-col gap-3">
          {/* Event selector */}
          {addableEvents.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">
                Which event?
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--fg)] outline-none"
              >
                {addableEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.year})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedEvent && (
            <AddLoreForm
              eventId={selectedEventId}
              ritualSlug={ritualSlug}
              year={selectedEvent.year}
              crewMembers={allMembers}
              allowedTypes={['memory', 'image', 'checkin']}
              onClose={() => setShowForm(false)}
            />
          )}
        </div>
      ) : (
        addableEvents.length > 0 && (
          <button
            onClick={handleOpenForm}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
          >
            <Plus size={13} /> Add lore
          </button>
        )
      )}

      {/* Feed */}
      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)] text-center py-8">
          {hasActiveFilters
            ? 'No lore matches your filters.'
            : 'No lore yet. Be the first to add a memory.'}
        </p>
      ) : (
        sorted.map((entry) => (
          <LorePost
            key={entry.id}
            entry={entry}
            userMap={userMap}
            currentUserId={currentUserId}
            canEdit={canEdit}
            showEventContext
            onToggleHOF={handleToggleHOF}
            onDelete={handleDelete}
            isToggling={toggling}
            isDeleting={deleting && deletingId === entry.id}
          />
        ))
      )}
    </div>
  )
}
