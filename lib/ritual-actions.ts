'use server'

import { db } from '@/db'
import { rituals, ritualAwardDefinitions, ritualMembers } from '@/db/schema'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import type { RitualInference } from '@/app/api/ritual/infer/route'

export async function joinRitual(token: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq }) => eq(r.inviteToken, token),
  })
  if (!ritual) throw new Error('Invalid invite link')

  const existing = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(eq(rm.ritualId, ritual.id), eq(rm.userId, session.user!.id!)),
  })

  if (!existing) {
    await db.insert(ritualMembers).values({
      id: crypto.randomUUID(),
      ritualId: ritual.id,
      userId: session.user.id!,
      role: 'crew_member',
      isCoreCrewe: false,
      joinedAt: new Date(),
    })
  }

  redirect(`/${ritual.slug}`)
}

export async function createRitual(
  inference: RitualInference,
  name: string,
  overrides?: Partial<RitualInference>
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const data = { ...inference, ...overrides, name }

  // Ensure slug is unique
  const base = data.slug
  let slug = base
  let attempt = 0
  while (true) {
    const existing = await db.query.rituals.findFirst({
      where: (r, { eq }) => eq(r.slug, slug),
    })
    if (!existing) break
    attempt++
    slug = `${base}-${attempt}`
  }

  const ritualId = crypto.randomUUID()
  const inviteToken = crypto.randomUUID()

  await db.insert(rituals).values({
    id: ritualId,
    name: data.name,
    slug,
    sponsorId: session.user.id,
    activityType: data.activityType,
    theme: data.theme,
    tagline: data.tagline,
    inviteToken,
    createdAt: new Date(),
  })

  // Default awards
  const [mvpName, lupName] = data.awards
  await db.insert(ritualAwardDefinitions).values([
    {
      id: crypto.randomUUID(),
      ritualId,
      name: mvpName ?? 'MVP',
      label: mvpName ?? 'Most Valuable Player',
      type: 'mvp',
      createdAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      ritualId,
      name: lupName ?? 'LUP',
      label: lupName ?? 'Least Useful Player',
      type: 'lup',
      createdAt: new Date(),
    },
  ])

  // Add creator as sponsor
  await db.insert(ritualMembers).values({
    id: crypto.randomUUID(),
    ritualId,
    userId: session.user.id,
    role: 'sponsor',
    isCoreCrewe: true,
    joinedAt: new Date(),
  })

  return { slug, inviteToken }
}
