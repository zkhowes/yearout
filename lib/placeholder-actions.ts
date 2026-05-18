'use server'

import { db } from '@/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { ritualMembers, rituals, users } from '@/db/schema'
import { eventAttendees } from '@/db/schema/crew'
import { convertStubReferences } from '@/lib/placeholder-claim'

const PLACEHOLDER_EMAIL_DOMAIN = 'placeholder.yearout.local'

async function assertSponsor(ritualId: string, userId: string) {
  const me = await db.query.ritualMembers.findFirst({
    where: (rm, { and: a, eq: e }) =>
      a(e(rm.ritualId, ritualId), e(rm.userId, userId), e(rm.role, 'sponsor')),
  })
  if (!me) throw new Error('Only sponsors can perform this action')
  return me
}

export async function addPlaceholderCrew(
  ritualId: string,
  data: {
    name: string
    nickname?: string
    nationality?: string
    email?: string
    eventId?: string // optionally auto-add as attendee of this event
  }
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  await assertSponsor(ritualId, session.user.id)

  const name = data.name.trim().slice(0, 100)
  if (!name) throw new Error('Name is required')

  const sponsorEmail = data.email?.trim().toLowerCase() || null

  // Email collision: if someone with this email already exists, bail with a
  // hint to use the regular invite link instead of creating a stub duplicate.
  if (sponsorEmail) {
    const existing = await db.query.users.findFirst({
      where: (u, { eq: e }) => e(u.email, sponsorEmail),
    })
    if (existing) {
      throw new Error(
        `${sponsorEmail} already has a yearout account. Share the ritual invite link instead.`
      )
    }
  }

  const stubUserId = crypto.randomUUID()
  const stubEmail = sponsorEmail ?? `placeholder+${stubUserId}@${PLACEHOLDER_EMAIL_DOMAIN}`

  await db.insert(users).values({
    id: stubUserId,
    name,
    email: stubEmail,
    emailVerified: null,
    image: null,
    nationality: data.nationality?.trim() || null,
    createdAt: new Date(),
  })

  const memberId = crypto.randomUUID()
  await db.insert(ritualMembers).values({
    id: memberId,
    ritualId,
    userId: stubUserId,
    role: 'crew_member',
    isCoreCrewe: false,
    nicknameOverride: data.nickname?.trim() || null,
    nationalityOverride: data.nationality?.trim() || null,
    isPlaceholder: true,
    placeholderCreatedBy: session.user.id,
    joinedAt: new Date(),
  })

  if (data.eventId) {
    // Verify the event belongs to this ritual before linking
    const ev = await db.query.events.findFirst({
      where: (e, { eq: eq2 }) => eq2(e.id, data.eventId!),
      columns: { id: true, ritualId: true },
    })
    if (ev && ev.ritualId === ritualId) {
      await db.insert(eventAttendees).values({
        id: crypto.randomUUID(),
        eventId: data.eventId,
        userId: stubUserId,
        bookingStatus: 'not_yet',
        isHost: false,
      })
    }
  }

  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq: e }) => e(r.id, ritualId),
    columns: { slug: true },
  })
  if (ritual) {
    revalidatePath(`/${ritual.slug}`)
    revalidatePath(`/${ritual.slug}/crew`)
    revalidatePath(`/${ritual.slug}/settings`)
  }

  // Caller (e.g. settings form) decides whether to send the Invite email next.
  return { memberId, stubUserId, hasRealEmail: !!sponsorEmail }
}

export async function removePlaceholderCrew(memberId: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { eq: e }) => e(rm.id, memberId),
  })
  if (!member) throw new Error('Member not found')
  if (!member.isPlaceholder) throw new Error('Cannot remove a real crew member this way')

  await assertSponsor(member.ritualId, session.user.id)

  const stubUserId = member.userId

  // Cascade-delete via ritualMembers FK removes the membership; then drop the
  // stub user row if it has no other memberships and no linked OAuth accounts.
  await db.delete(ritualMembers).where(eq(ritualMembers.id, memberId))

  const otherMemberships = await db.query.ritualMembers.findFirst({
    where: (rm, { eq: e }) => e(rm.userId, stubUserId),
  })
  const linkedAccount = await db.query.accounts.findFirst({
    where: (a, { eq: e }) => e(a.userId, stubUserId),
  })
  if (!otherMemberships && !linkedAccount) {
    await db.delete(users).where(eq(users.id, stubUserId))
  }

  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq: e }) => e(r.id, member.ritualId),
    columns: { slug: true },
  })
  if (ritual) {
    revalidatePath(`/${ritual.slug}/crew`)
    revalidatePath(`/${ritual.slug}/settings`)
  }
}

export async function generateReadOnlyLink(ritualId: string): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  await assertSponsor(ritualId, session.user.id)

  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq: e }) => e(r.id, ritualId),
  })
  if (!ritual) throw new Error('Ritual not found')

  if (ritual.readOnlyToken) return ritual.readOnlyToken

  const token = crypto.randomUUID()
  await db
    .update(rituals)
    .set({ readOnlyToken: token })
    .where(eq(rituals.id, ritualId))

  revalidatePath(`/${ritual.slug}/settings`)
  return token
}

export async function rotateReadOnlyLink(ritualId: string): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  await assertSponsor(ritualId, session.user.id)

  const token = crypto.randomUUID()
  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq: e }) => e(r.id, ritualId),
    columns: { slug: true },
  })
  await db.update(rituals).set({ readOnlyToken: token }).where(eq(rituals.id, ritualId))
  if (ritual) revalidatePath(`/${ritual.slug}/settings`)
  return token
}

/**
 * Reassign all references from a stub user to the signed-in real user, then
 * delete the stub. Manual claim path from /view/[token]/claim.
 */
export async function claimPlaceholder(memberId: string): Promise<{ ritualSlug: string; ritualId: string }> {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const realUserId = session.user.id

  const placeholder = await db.query.ritualMembers.findFirst({
    where: (rm, { eq: e }) => e(rm.id, memberId),
  })
  if (!placeholder) throw new Error('Placeholder not found')
  if (!placeholder.isPlaceholder) throw new Error('This crew member has already been claimed')

  const stubUserId = placeholder.userId
  if (stubUserId === realUserId) throw new Error('You cannot claim yourself')

  await convertStubReferences(stubUserId, realUserId)

  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq: e }) => e(r.id, placeholder.ritualId),
    columns: { slug: true },
  })
  const ritualSlug = ritual?.slug ?? ''
  if (ritualSlug) {
    revalidatePath(`/${ritualSlug}`)
    revalidatePath(`/${ritualSlug}/crew`)
  }

  return { ritualSlug, ritualId: placeholder.ritualId }
}

