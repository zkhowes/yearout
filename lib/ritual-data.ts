import { cache } from 'react'
import { db } from '@/db'
import { ritualMembers } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

/**
 * Cached ritual lookup by slug.
 * React.cache() deduplicates within a single server render —
 * layout and child pages call this but only one DB query executes.
 */
export const getRitual = cache(async (slug: string) => {
  return db.query.rituals.findFirst({
    where: (r, { eq }) => eq(r.slug, slug),
  })
})

/**
 * Cached membership lookup for a user in a ritual.
 */
export const getMembership = cache(async (ritualId: string, userId: string) => {
  const [member] = await db
    .select()
    .from(ritualMembers)
    .where(
      and(
        eq(ritualMembers.ritualId, ritualId),
        eq(ritualMembers.userId, userId)
      )
    )
    .limit(1)
  return member ?? null
})
