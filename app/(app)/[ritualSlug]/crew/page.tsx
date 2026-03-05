import { db } from '@/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import {
  ritualMembers,
  eventAttendees,
  events,
  awards,
  ritualAwardDefinitions,
  users,
} from '@/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { CrewGrid } from './crew-grid'
import { getRitual } from '@/lib/ritual-data'

export default async function CrewPage({
  params,
}: {
  params: { ritualSlug: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ritual = await getRitual(params.ritualSlug)
  if (!ritual) redirect('/')

  // Fetch all ritual members with user data
  const members = await db
    .select({
      userId: ritualMembers.userId,
      role: ritualMembers.role,
      isCoreCrewe: ritualMembers.isCoreCrewe,
      nicknameOverride: ritualMembers.nicknameOverride,
      photoOverride: ritualMembers.photoOverride,
      nationalityOverride: ritualMembers.nationalityOverride,
      customFlagSvg: ritualMembers.customFlagSvg,
      userName: users.name,
      userImage: users.image,
      nationality: users.nationality,
    })
    .from(ritualMembers)
    .innerJoin(users, eq(ritualMembers.userId, users.id))
    .where(eq(ritualMembers.ritualId, ritual.id))

  // Load events + award definitions in parallel
  const [ritualEvents, awardDefs] = await Promise.all([
    db.select({ id: events.id, year: events.year }).from(events).where(eq(events.ritualId, ritual.id)),
    db.select().from(ritualAwardDefinitions).where(eq(ritualAwardDefinitions.ritualId, ritual.id)),
  ])
  const eventIds = ritualEvents.map((e) => e.id)

  // Count attendance + load awards in parallel (both depend on eventIds)
  const attendanceCounts = new Map<string, number>()
  const userAwards = new Map<string, { name: string; year: number }[]>()

  if (eventIds.length > 0) {
    const [counts, allAwards] = await Promise.all([
      db
        .select({
          userId: eventAttendees.userId,
          count: sql<number>`count(*)::int`,
        })
        .from(eventAttendees)
        .where(
          and(
            inArray(eventAttendees.eventId, eventIds),
            sql`${eventAttendees.bookingStatus} != 'out'`
          )
        )
        .groupBy(eventAttendees.userId),
      db.select().from(awards).where(inArray(awards.eventId, eventIds)),
    ])

    for (const row of counts) {
      attendanceCounts.set(row.userId, row.count)
    }

    const awardDefMap = new Map(awardDefs.map((d) => [d.id, d]))
    const eventYearMap = new Map(ritualEvents.map((e) => [e.id, e.year]))

    for (const award of allAwards) {
      const def = awardDefMap.get(award.awardDefinitionId)
      if (!def) continue
      const year = eventYearMap.get(award.eventId) ?? 0
      const list = userAwards.get(award.winnerId) ?? []
      list.push({ name: def.name, year })
      userAwards.set(award.winnerId, list)
    }
  }

  // Build crew data for client component
  const crewData = members.map((m) => ({
    userId: m.userId,
    name: m.userName,
    image: m.photoOverride ?? m.userImage,
    nickname: m.nicknameOverride,
    role: m.role,
    isCoreCrewe: m.isCoreCrewe,
    nationality: m.nationalityOverride ?? m.nationality,
    customFlagSvg: m.customFlagSvg,
    eventsAttended: attendanceCounts.get(m.userId) ?? 0,
    awards: userAwards.get(m.userId) ?? [],
  }))

  crewData.sort((a, b) => b.eventsAttended - a.eventsAttended)

  const isSponsor = members.some(
    (m) => m.userId === session.user!.id && m.role === 'sponsor'
  )

  return (
    <div className="flex flex-col gap-4">
      <CrewGrid
        crew={crewData}
        isSponsor={isSponsor}
        ritualId={ritual.id}
        ritualSlug={params.ritualSlug}
      />
    </div>
  )
}
