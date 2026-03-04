import { db } from '@/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import {
  events,
  loreEntries,
  loreMentions,
  ritualMembers,
  users,
} from '@/db/schema'
import { eq, inArray, desc } from 'drizzle-orm'
import { RitualLoreFeed } from './ritual-lore-feed'
import type { LoreEntryData } from '@/components/lore/lore-post'

export default async function LorePage({
  params,
}: {
  params: { ritualSlug: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq }) => eq(r.slug, params.ritualSlug),
  })
  if (!ritual) redirect('/')

  const [member] = await db
    .select()
    .from(ritualMembers)
    .where(
      eq(ritualMembers.ritualId, ritual.id)
    )
    .limit(1)
    .then((rows) => rows.filter((r) => r.userId === session.user!.id))

  if (!member) redirect('/')

  // All events for this ritual
  const allEvents = await db
    .select()
    .from(events)
    .where(eq(events.ritualId, ritual.id))
    .orderBy(desc(events.year))

  const eventIds = allEvents.map((e) => e.id)

  if (eventIds.length === 0) {
    return (
      <div className="flex flex-col gap-4 text-sm text-[var(--fg-muted)]">
        <p className="text-[var(--fg)] font-semibold">Lore</p>
        <p>No events yet. Create an event to start capturing lore.</p>
      </div>
    )
  }

  // All lore across all events
  const allLore = await db
    .select()
    .from(loreEntries)
    .where(inArray(loreEntries.eventId, eventIds))
    .orderBy(desc(loreEntries.createdAt))

  // All mentions
  const loreIds = allLore.map((l) => l.id)
  const allMentions =
    loreIds.length > 0
      ? await db
          .select()
          .from(loreMentions)
          .where(inArray(loreMentions.loreEntryId, loreIds))
      : []

  // All crew member user data
  const allMembers = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
    })
    .from(ritualMembers)
    .innerJoin(users, eq(ritualMembers.userId, users.id))
    .where(eq(ritualMembers.ritualId, ritual.id))

  // Build event map for context labels
  const eventMap = new Map(
    allEvents.map((e) => [e.id, { year: e.year, name: e.name }])
  )

  // Attach mentions + event context to entries
  const enrichedLore: LoreEntryData[] = allLore.map((l) => ({
    ...l,
    type: l.type as 'memory' | 'checkin' | 'image',
    mentions: allMentions
      .filter((m) => m.loreEntryId === l.id)
      .map((m) => ({ userId: m.userId })),
    eventYear: eventMap.get(l.eventId)?.year,
    eventName: eventMap.get(l.eventId)?.name,
  }))

  // Generate synthetic lore entries for video edits and group photos
  for (const ev of allEvents) {
    if (ev.editUrl) {
      enrichedLore.push({
        id: `synth-edit-${ev.id}`,
        authorId: ev.organizerId ?? member.userId,
        type: 'image',
        content: null,
        mediaUrl: ev.editThumbnailUrl ?? null,
        location: ev.location,
        isHallOfFame: false,
        day: null,
        createdAt: ev.createdAt,
        mentions: [],
        eventYear: ev.year,
        eventName: ev.name,
        subtype: 'video_edit',
        editUrl: ev.editUrl,
      })
    }
    if (ev.coverPhotoUrl) {
      enrichedLore.push({
        id: `synth-photo-${ev.id}`,
        authorId: ev.organizerId ?? member.userId,
        type: 'image',
        content: null,
        mediaUrl: ev.coverPhotoUrl,
        location: ev.location,
        isHallOfFame: false,
        day: null,
        createdAt: ev.createdAt,
        mentions: [],
        eventYear: ev.year,
        eventName: ev.name,
        subtype: 'group_photo',
      })
    }
  }

  return (
    <RitualLoreFeed
      entries={enrichedLore}
      allMembers={allMembers}
      allEvents={allEvents.map((e) => ({
        id: e.id,
        name: e.name,
        year: e.year,
        status: e.status,
      }))}
      currentUserId={session.user.id!}
      canEdit={member.role === 'sponsor'}
      ritualSlug={params.ritualSlug}
    />
  )
}
