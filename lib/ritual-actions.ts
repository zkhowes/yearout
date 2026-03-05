'use server'

import { db } from '@/db'
import { rituals, ritualAwardDefinitions, ritualMembers } from '@/db/schema'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import type { RitualInference } from '@/app/api/ritual/infer/route'

export async function updateRitual(
  ritualId: string,
  data: {
    name?: string
    tagline?: string
    theme?: 'circuit' | 'club' | 'trail' | 'getaway'
    activityType?: string
    foundingYear?: string
    bylaws?: string
    description?: string
    logoUrl?: string
  }
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(eq(rm.ritualId, ritualId), eq(rm.userId, session.user!.id!), eq(rm.role, 'sponsor')),
  })
  if (!member) throw new Error('Only sponsors can update ritual settings')

  await db
    .update(rituals)
    .set({
      ...(data.name && { name: data.name.trim().slice(0, 100) }),
      ...(data.tagline !== undefined && { tagline: data.tagline.trim().slice(0, 200) }),
      ...(data.theme && { theme: data.theme }),
      ...(data.activityType && { activityType: data.activityType as typeof rituals.$inferInsert['activityType'] }),
      ...(data.foundingYear !== undefined && { foundingYear: data.foundingYear }),
      ...(data.bylaws !== undefined && { bylaws: data.bylaws.slice(0, 10000) }),
      ...(data.description !== undefined && { description: data.description.slice(0, 5000) }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
    })
    .where(eq(rituals.id, ritualId))
}

export async function updateRitualHeroPhotos(
  ritualId: string,
  ritualSlug: string,
  photos: string[]
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(eq(rm.ritualId, ritualId), eq(rm.userId, session.user!.id!), eq(rm.role, 'sponsor')),
  })
  if (!member) throw new Error('Only sponsors can update hero photos')

  await db
    .update(rituals)
    .set({ heroPhotos: JSON.stringify(photos) })
    .where(eq(rituals.id, ritualId))

  revalidatePath(`/${ritualSlug}`)
}

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

  // Awards — 0 is valid (e.g. family trips), first = mvp, second = lup, rest = custom
  const awardTypes = ['mvp', 'lup'] as const
  const awardsToInsert = data.awards
    .filter((a) => a.trim().length > 0)
    .map((name, i) => ({
      id: crypto.randomUUID(),
      ritualId,
      name: name.trim(),
      label: name.trim(),
      type: (i < awardTypes.length ? awardTypes[i] : 'custom') as string,
      createdAt: new Date(),
    }))

  if (awardsToInsert.length > 0) {
    await db.insert(ritualAwardDefinitions).values(awardsToInsert)
  }

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

export async function updateCrewNickname(
  ritualId: string,
  targetUserId: string,
  nickname: string,
  ritualSlug: string
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and: a, eq: e }) =>
      a(e(rm.ritualId, ritualId), e(rm.userId, session.user!.id!), e(rm.role, 'sponsor')),
  })
  if (!member) throw new Error('Only the sponsor can edit nicknames')

  await db
    .update(ritualMembers)
    .set({ nicknameOverride: nickname.trim() || null })
    .where(
      and(
        eq(ritualMembers.ritualId, ritualId),
        eq(ritualMembers.userId, targetUserId)
      )
    )

  revalidatePath(`/${ritualSlug}/crew`)
}

export async function updateCrewNationality(
  ritualId: string,
  targetUserId: string,
  nationality: string,
  customFlagSvg: string | null,
  ritualSlug: string,
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and: a, eq: e }) =>
      a(e(rm.ritualId, ritualId), e(rm.userId, session.user!.id!), e(rm.role, 'sponsor')),
  })
  if (!member) throw new Error('Only the sponsor can edit nationality')

  await db
    .update(ritualMembers)
    .set({
      nationalityOverride: nationality.trim() || null,
      customFlagSvg: customFlagSvg,
    })
    .where(
      and(
        eq(ritualMembers.ritualId, ritualId),
        eq(ritualMembers.userId, targetUserId)
      )
    )

  revalidatePath(`/${ritualSlug}/crew`)
}

export async function updateCrewCoreStatus(
  ritualId: string,
  targetUserId: string,
  isCoreCrewe: boolean,
  ritualSlug: string,
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and: a, eq: e }) =>
      a(e(rm.ritualId, ritualId), e(rm.userId, session.user!.id!), e(rm.role, 'sponsor')),
  })
  if (!member) throw new Error('Only the sponsor can edit core crew status')

  await db
    .update(ritualMembers)
    .set({ isCoreCrewe })
    .where(
      and(
        eq(ritualMembers.ritualId, ritualId),
        eq(ritualMembers.userId, targetUserId)
      )
    )

  revalidatePath(`/${ritualSlug}/crew`)
}
