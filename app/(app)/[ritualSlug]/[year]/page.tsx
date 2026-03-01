import Link from 'next/link'
import { db } from '@/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import {
  eventProposals,
  proposalVotes,
  ritualMembers,
  eventAttendees,
  loreEntries,
  activityResults,
  expenses,
  awardVotes,
  awards,
  ritualAwardDefinitions,
  dailyItinerary,
  users,
} from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'
import { Proposals } from './proposals'
import { ScheduledView } from './scheduled-view'
import { InProgressView } from './in-progress-view'

export default async function EventPage({
  params,
}: {
  params: { ritualSlug: string; year: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const year = parseInt(params.year, 10)
  if (isNaN(year)) redirect(`/${params.ritualSlug}`)

  // Ritual + membership (layout has already verified, but we need role here)
  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq }) => eq(r.slug, params.ritualSlug),
  })
  if (!ritual) redirect('/')

  const [member] = await db
    .select()
    .from(ritualMembers)
    .where(and(eq(ritualMembers.ritualId, ritual.id), eq(ritualMembers.userId, session.user.id!)))
    .limit(1)
  if (!member) redirect('/')

  const isSponsor = member.role === 'sponsor'

  // Event
  const event = await db.query.events.findFirst({
    where: (e, { and, eq }) => and(eq(e.ritualId, ritual.id), eq(e.year, year)),
  })
  if (!event) redirect(`/${params.ritualSlug}`)

  const isOrganizer = event.organizerId === session.user.id
  const canEdit = isSponsor || isOrganizer

  // ── Planning state: load proposals + votes ────────────────────────────────
  const proposalList =
    event.status === 'planning'
      ? await db
          .select()
          .from(eventProposals)
          .where(eq(eventProposals.eventId, event.id))
          .orderBy(eventProposals.createdAt)
      : []

  const proposalIds = proposalList.map((p) => p.id)
  const relevantVotes =
    proposalIds.length > 0
      ? await db
          .select()
          .from(proposalVotes)
          .where(inArray(proposalVotes.proposalId, proposalIds))
      : []

  const proposals = proposalList.map((p) => ({
    id: p.id,
    location: p.location,
    dates: p.dates,
    notes: p.notes,
    votes: relevantVotes.filter((v) => v.proposalId === p.id),
    myVote: relevantVotes.find(
      (v) => v.proposalId === p.id && v.userId === session.user!.id
    )?.vote ?? null,
  }))

  // ── Scheduled / In-Progress / Closed: load attendees ─────────────────────
  let attendeeList: { id: string; userId: string; bookingStatus: 'not_yet' | 'committed' | 'flights_booked' | 'all_booked' | 'out'; arrivalAirline: string | null; arrivalFlightNumber: string | null; arrivalDatetime: Date | null; departureAirline: string | null; departureFlightNumber: string | null; departureDatetime: Date | null }[] = []
  let attendeeUsers: { id: string; name: string | null; image: string | null }[] = []
  let myAttendee: (typeof attendeeList)[0] | null = null

  // In-progress / closed: also load lore, expenses, activity, awards
  let expenseList: { id: string; paidBy: string; description: string; amount: number; createdAt: Date }[] = []
  let loreList: { id: string; authorId: string; type: 'memory' | 'checkin' | 'image'; content: string | null; location: string | null; isHallOfFame: boolean; day: Date | null; createdAt: Date }[] = []
  let activityList: { id: string; userId: string; metric: string; value: string; unit: string | null; day: Date | null; createdAt: Date }[] = []
  let awardDefs: { id: string; name: string; label: string; type: string }[] = []
  let currentAwards: { id: string; awardDefinitionId: string; winnerId: string }[] = []
  let awardVoteList: { id: string; awardDefinitionId: string; voterId: string; nomineeId: string }[] = []
  let itineraryList: { id: string; day: Date; themeName: string | null; notes: string | null }[] = []

  if (event.status !== 'planning') {
    const rawAttendees = await db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, event.id))

    attendeeList = rawAttendees as typeof attendeeList
    myAttendee = attendeeList.find((a) => a.userId === session.user!.id) ?? null

    if (rawAttendees.length > 0) {
      const userIds = Array.from(new Set(rawAttendees.map((a) => a.userId)))
      const userRows = await db
        .select({ id: users.id, name: users.name, image: users.image })
        .from(users)
        .where(inArray(users.id, userIds))
      attendeeUsers = userRows
    }

    if (event.status === 'scheduled' || event.status === 'in_progress' || event.status === 'closed') {
      const [rawExpenses, rawLore, rawActivity, rawAwardDefs, rawAwards, rawVotes, rawItinerary] =
        await Promise.all([
          db.select().from(expenses).where(eq(expenses.eventId, event.id)),
          db.select().from(loreEntries).where(eq(loreEntries.eventId, event.id)),
          db.select().from(activityResults).where(eq(activityResults.eventId, event.id)),
          db.select().from(ritualAwardDefinitions).where(eq(ritualAwardDefinitions.ritualId, ritual.id)),
          db.select().from(awards).where(eq(awards.eventId, event.id)),
          db.select().from(awardVotes).where(eq(awardVotes.eventId, event.id)),
          db.select().from(dailyItinerary).where(eq(dailyItinerary.eventId, event.id)),
        ])

      expenseList = rawExpenses as typeof expenseList
      loreList = rawLore as typeof loreList
      activityList = rawActivity as typeof activityList
      awardDefs = rawAwardDefs
      currentAwards = rawAwards
      awardVoteList = rawVotes
      itineraryList = rawItinerary

      // Collect any additional user IDs from expenses/lore/activity
      const extraUserIds = [
        ...rawExpenses.map((e) => e.paidBy),
        ...rawLore.map((l) => l.authorId),
        ...rawActivity.map((a) => a.userId),
        ...rawAwards.map((a) => a.winnerId),
        ...rawVotes.map((v) => v.voterId),
        ...rawVotes.map((v) => v.nomineeId),
      ].filter((id) => !attendeeUsers.some((u) => u.id === id))

      if (extraUserIds.length > 0) {
        const deduped = Array.from(new Set(extraUserIds))
        const extra = await db
          .select({ id: users.id, name: users.name, image: users.image })
          .from(users)
          .where(inArray(users.id, deduped))
        attendeeUsers = [...attendeeUsers, ...extra]
      }
    }
  }

  // ── Status badge ──────────────────────────────────────────────────────────
  const statusBadge = {
    planning: <span className="text-xs px-2 py-1 rounded-full bg-yellow-400/20 text-yellow-600 font-medium border border-yellow-400/30">Planning</span>,
    scheduled: <span className="text-xs px-2 py-1 rounded-full bg-green-400/20 text-green-600 font-medium border border-green-400/30">Confirmed</span>,
    in_progress: <span className="text-xs px-2 py-1 rounded-full bg-blue-400/20 text-blue-600 font-medium border border-blue-400/30">Live</span>,
    closed: <span className="text-xs px-2 py-1 rounded-full bg-[var(--border)] text-[var(--fg-muted)] font-medium">Closed</span>,
  }[event.status]

  const statusLabel = {
    planning: 'Planning',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    closed: 'Archive',
  }[event.status]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* Back nav */}
      <Link
        href={`/${ritual.slug}`}
        className="flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors -mt-2"
      >
        <ArrowLeft size={14} /> {ritual.name}
      </Link>

      {/* Event hero */}
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">{year}</p>
        <h1 className="text-3xl font-bold text-[var(--fg)]">{event.name}</h1>
        {event.location && (
          <p className="text-[var(--fg-muted)]">{event.location}</p>
        )}
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">{statusLabel}</p>
        {statusBadge}
      </div>

      {/* ── Planning state ── */}
      {event.status === 'planning' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--fg)]">
            Propose dates and locations. Crew votes. Sponsor locks it in.
          </p>
          <Proposals
            eventId={event.id}
            ritualSlug={ritual.slug}
            proposals={proposals}
            isSponsor={isSponsor}
          />
        </div>
      )}

      {/* ── Scheduled state ── */}
      {event.status === 'scheduled' && (
        <ScheduledView
          event={{
            id: event.id,
            location: event.location,
            mountains: event.mountains,
            startDate: event.startDate,
            endDate: event.endDate,
            year: event.year,
          }}
          attendees={attendeeList}
          attendeeUsers={attendeeUsers}
          myAttendee={myAttendee}
          canEdit={canEdit}
          itineraryList={itineraryList}
          expenseList={expenseList}
          loreList={loreList}
          currentUserId={session.user!.id!}
          ritualSlug={ritual.slug}
        />
      )}

      {/* ── In-progress state ── */}
      {event.status === 'in_progress' && (
        <InProgressView
          event={{
            id: event.id,
            location: event.location,
            mountains: event.mountains,
            year: event.year,
            startDate: event.startDate,
            endDate: event.endDate,
          }}
          attendees={attendeeList}
          attendeeUsers={attendeeUsers}
          myAttendee={myAttendee}
          expenseList={expenseList}
          loreList={loreList}
          activityList={activityList}
          awardDefs={awardDefs}
          currentAwards={currentAwards}
          awardVoteList={awardVoteList}
          itineraryList={itineraryList}
          currentUserId={session.user!.id!}
          canEdit={canEdit}
          ritualSlug={ritual.slug}
        />
      )}

      {/* ── Closed / archive state ── */}
      {event.status === 'closed' && (
        <div className="flex flex-col gap-6">
          {/* Location card */}
          {event.location && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="text-xl font-bold text-[var(--fg)]">{event.location}</p>
              {event.mountains && (
                <p className="text-sm text-[var(--fg-muted)] mt-1">{event.mountains}</p>
              )}
              {(event.startDate || event.endDate) && (
                <p className="text-sm text-[var(--fg-muted)] mt-1">
                  {[event.startDate, event.endDate]
                    .filter(Boolean)
                    .map((d) => d!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
                    .join(' – ')}
                </p>
              )}
            </div>
          )}

          {/* Awards */}
          {currentAwards.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Awards</p>
              <div className="flex flex-col gap-1">
                {currentAwards.map((award) => {
                  const def = awardDefs.find((d) => d.id === award.awardDefinitionId)
                  const winner = attendeeUsers.find((u) => u.id === award.winnerId)
                  return (
                    <div key={award.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)]">
                      <p className="text-sm text-[var(--fg-muted)] w-24 shrink-0">{def?.name}</p>
                      <p className="text-sm font-semibold text-[var(--fg)]">{winner?.name ?? 'Unknown'}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Lore */}
          {loreList.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Lore</p>
              {[...loreList]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .filter((e) => e.isHallOfFame)
                .map((entry) => {
                  const author = attendeeUsers.find((u) => u.id === entry.authorId)
                  return (
                    <div key={entry.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                      <p className="text-sm text-[var(--fg)]">{entry.content}</p>
                      <p className="text-xs text-[var(--fg-muted)] mt-1">{author?.name?.split(' ')[0]}</p>
                    </div>
                  )
                })}
            </div>
          )}

          {/* Attendees */}
          {attendeeList.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Crew</p>
              <p className="text-sm text-[var(--fg)]">
                {attendeeList
                  .map((a) => attendeeUsers.find((u) => u.id === a.userId)?.name?.split(' ')[0])
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
