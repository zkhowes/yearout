import Link from 'next/link'
import { db } from '@/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import {
  ritualMembers,
  ritualAwardDefinitions,
  events,
  awards,
  users,
} from '@/db/schema'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { Plus } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  planning: 'Planning',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  closed: 'Closed',
}

export default async function RitualTourPage({
  params,
}: {
  params: { ritualSlug: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Load ritual (layout already verified membership, but we need it for queries)
  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq }) => eq(r.slug, params.ritualSlug),
  })
  if (!ritual) redirect('/')

  // Load member role
  const [member] = await db
    .select()
    .from(ritualMembers)
    .where(
      and(
        eq(ritualMembers.ritualId, ritual.id),
        eq(ritualMembers.userId, session.user.id!)
      )
    )
    .limit(1)

  const isSponsor = member?.role === 'sponsor'

  // Load events (newest first)
  const eventList = await db
    .select()
    .from(events)
    .where(eq(events.ritualId, ritual.id))
    .orderBy(desc(events.year))

  // Load award definitions — find MVP def
  const awardDefs = await db
    .select()
    .from(ritualAwardDefinitions)
    .where(eq(ritualAwardDefinitions.ritualId, ritual.id))

  const mvpDef = awardDefs.find((d) => d.type === 'mvp')

  // Load MVP awards for all events
  const eventIds = eventList.map((e) => e.id)
  const mvpAwards =
    eventIds.length > 0 && mvpDef
      ? await db
          .select()
          .from(awards)
          .where(
            and(
              inArray(awards.eventId, eventIds),
              eq(awards.awardDefinitionId, mvpDef.id)
            )
          )
      : []

  // Fetch all referenced users (organizers + award winners)
  const userIdSet = new Set<string>()
  eventList.forEach((e) => { if (e.organizerId) userIdSet.add(e.organizerId) })
  mvpAwards.forEach((a) => userIdSet.add(a.winnerId))
  const userIds = Array.from(userIdSet)
  const userList =
    userIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, userIds))
      : []
  const userMap = Object.fromEntries(userList.map((u) => [u.id, u]))

  // Build MVP map keyed by eventId
  const mvpByEvent = Object.fromEntries(
    mvpAwards.map((a) => [a.eventId, userMap[a.winnerId]])
  )

  // Determine hero block
  const activeEvent = eventList.find(
    (e) => e.status === 'planning' || e.status === 'scheduled'
  )
  const lastClosedEvent = eventList.find((e) => e.status === 'closed')

  return (
    <div className="flex flex-col gap-8">

      {/* ── Hero block ── */}
      {activeEvent ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
              Next Event
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--bg)] font-semibold">
              {STATUS_LABEL[activeEvent.status]}
            </span>
          </div>
          <div>
            <p className="text-xl font-bold text-[var(--fg)]">{activeEvent.name}</p>
            {activeEvent.location && (
              <p className="text-sm text-[var(--fg-muted)] mt-0.5">{activeEvent.location}</p>
            )}
          </div>
          <Link
            href={`/${ritual.slug}/${activeEvent.year}`}
            className="text-sm font-semibold text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            View event →
          </Link>
        </div>
      ) : lastClosedEvent ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
            Last Event
          </span>
          <p className="text-xl font-bold text-[var(--fg)]">{lastClosedEvent.name}</p>
          {lastClosedEvent.location && (
            <p className="text-sm text-[var(--fg-muted)]">{lastClosedEvent.location}</p>
          )}
          {mvpByEvent[lastClosedEvent.id] && (
            <p className="text-sm text-[var(--fg-muted)]">
              {mvpDef?.name ?? 'MVP'}:{' '}
              <span className="text-[var(--fg)] font-medium">
                {mvpByEvent[lastClosedEvent.id].name}
              </span>
            </p>
          )}
        </div>
      ) : isSponsor ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center flex flex-col gap-3">
          <p className="text-[var(--fg-muted)] text-sm">No events yet.</p>
          <Link
            href={`/${ritual.slug}/new-event`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg btn-accent text-sm font-semibold self-center"
          >
            <Plus size={14} /> Plan your first event
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
          <p className="text-[var(--fg-muted)] text-sm">No events planned yet. Stay tuned.</p>
        </div>
      )}

      {/* ── Tour table ── */}
      {eventList.length > 0 && (
        <div className="flex flex-col gap-1">
          <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)] mb-2">
            The Archive
          </h2>

          {/* Header row */}
          <div className="grid grid-cols-[3rem_1fr_1fr_1fr] gap-2 px-3 py-1 text-xs uppercase tracking-widest text-[var(--fg-muted)]">
            <span>Year</span>
            <span>Location</span>
            <span>Host</span>
            <span>{mvpDef?.name ?? 'MVP'}</span>
          </div>

          {/* Event rows */}
          {eventList.map((event) => {
            const organizer = event.organizerId ? userMap[event.organizerId] : null
            const mvp = mvpByEvent[event.id]
            return (
              <Link
                key={event.id}
                href={`/${ritual.slug}/${event.year}`}
                className="grid grid-cols-[3rem_1fr_1fr_1fr] gap-2 px-3 py-3 rounded-lg text-sm border border-transparent hover:border-[var(--border)] hover:bg-[var(--surface)] transition-all"
              >
                <span className="font-mono font-bold text-[var(--fg)]">{event.year}</span>
                <span className="text-[var(--fg)] truncate">{event.location ?? '—'}</span>
                <span className="text-[var(--fg-muted)] truncate">
                  {organizer?.name?.split(' ')[0] ?? '—'}
                </span>
                <span className="text-[var(--fg-muted)] truncate">
                  {mvp?.name?.split(' ')[0] ?? '—'}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {/* ── Sponsor: add a year ── */}
      {isSponsor && eventList.length > 0 && (
        <Link
          href={`/${ritual.slug}/new-event`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg)] transition-colors"
        >
          <Plus size={14} /> Add a year
        </Link>
      )}
    </div>
  )
}
