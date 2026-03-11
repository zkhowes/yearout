'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { toggleLoreHOF, deleteLoreEntry, moveLoreEntry } from '@/lib/event-actions'
import { LorePost, type LoreEntryData, type EventOption } from './lore-post'
import { AddLoreForm } from './add-lore-form'

type CrewMember = {
  id: string
  name: string | null
  image: string | null
}

type LoreFeedProps = {
  entries: LoreEntryData[]
  userMap: Map<string, { id: string; name: string | null; image: string | null }>
  crewMembers: CrewMember[]
  currentUserId: string
  canEdit: boolean
  ritualSlug: string
  eventId: string
  year: number
  showEventContext?: boolean
  allowedTypes?: ('memory' | 'image' | 'checkin')[]
  allEvents?: EventOption[]
}

export function LoreFeed({
  entries,
  userMap,
  crewMembers,
  currentUserId,
  canEdit,
  ritualSlug,
  eventId,
  year,
  showEventContext = false,
  allowedTypes,
  allEvents,
}: LoreFeedProps) {
  const [showForm, setShowForm] = useState(false)
  const [toggling, startToggle] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, startDelete] = useTransition()
  const [movingId, setMovingId] = useState<string | null>(null)
  const [moving, startMove] = useTransition()

  const sorted = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  function handleToggleHOF(entryId: string) {
    startToggle(async () => {
      await toggleLoreHOF(entryId, ritualSlug, year)
    })
  }

  function handleDelete(entryId: string) {
    setDeletingId(entryId)
    startDelete(async () => {
      await deleteLoreEntry(entryId, ritualSlug, year)
      setDeletingId(null)
    })
  }

  function handleMove(entryId: string, targetEventId: string) {
    setMovingId(entryId)
    startMove(async () => {
      await moveLoreEntry(entryId, targetEventId, ritualSlug, year)
      setMovingId(null)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {showForm ? (
        <AddLoreForm
          eventId={eventId}
          ritualSlug={ritualSlug}
          year={year}
          crewMembers={crewMembers}
          allowedTypes={allowedTypes}
          onClose={() => setShowForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
        >
          <Plus size={13} /> Add lore
        </button>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)] text-center py-4">
          No lore yet. Be the first to add a memory.
        </p>
      ) : (
        sorted.map((entry) => (
          <LorePost
            key={entry.id}
            entry={entry}
            userMap={userMap}
            currentUserId={currentUserId}
            canEdit={canEdit}
            showEventContext={showEventContext}
            onToggleHOF={handleToggleHOF}
            onDelete={handleDelete}
            onMove={allEvents ? handleMove : undefined}
            isToggling={toggling}
            isDeleting={deleting && deletingId === entry.id}
            isMoving={moving && movingId === entry.id}
            allEvents={allEvents}
            currentEventId={eventId}
          />
        ))
      )}
    </div>
  )
}
