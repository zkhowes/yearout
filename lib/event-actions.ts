'use server'

import { db } from '@/db'
import { events } from '@/db/schema'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export async function createEvent(
  ritualId: string,
  ritualSlug: string,
  data: {
    name: string
    year: number
    location?: string
    mountains?: string
  }
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Sponsor-only
  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(
        eq(rm.ritualId, ritualId),
        eq(rm.userId, session.user!.id!),
        eq(rm.role, 'sponsor')
      ),
  })
  if (!member) throw new Error('Only the sponsor can create events')

  await db.insert(events).values({
    id: crypto.randomUUID(),
    ritualId,
    organizerId: session.user.id!,
    name: data.name.trim(),
    year: data.year,
    location: data.location?.trim() || null,
    mountains: data.mountains?.trim() || null,
    status: 'planning',
    createdAt: new Date(),
  })

  redirect(`/${ritualSlug}`)
}
