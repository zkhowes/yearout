'use server'

import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/db'
import { ritualMembers } from '@/db/schema'
import { claimPlaceholder } from '@/lib/placeholder-actions'
import { sendCallEmail } from '@/lib/email/send'
import { SponsorClaimNoticeEmail } from '@/emails/SponsorClaimNotice'
import * as React from 'react'

export async function claimAndRedirect(formData: FormData) {
  const memberId = String(formData.get('memberId') ?? '')
  if (!memberId) throw new Error('memberId required')

  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Snapshot the placeholder name + ritual for the notice email BEFORE the claim
  // (after the claim, the placeholder row no longer exists in placeholder form).
  const placeholder = await db.query.ritualMembers.findFirst({
    where: (rm, { eq: e }) => e(rm.id, memberId),
    with: { },
  })
  if (!placeholder?.isPlaceholder) throw new Error('That spot has already been claimed')

  const stubUser = await db.query.users.findFirst({
    where: (u, { eq: e }) => e(u.id, placeholder.userId),
    columns: { name: true },
  })
  const placeholderName = stubUser?.name ?? null

  const { ritualSlug, ritualId } = await claimPlaceholder(memberId)

  // Best-effort sponsor notice
  try {
    const ritual = await db.query.rituals.findFirst({
      where: (r, { eq: e }) => e(r.id, ritualId),
    })
    if (ritual) {
      const sponsor = await db.query.users.findFirst({
        where: (u, { eq: e }) => e(u.id, ritual.sponsorId),
        columns: { email: true },
      })
      if (sponsor?.email && !sponsor.email.endsWith('@placeholder.yearout.local')) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yearout.zkhowes.fun'
        await sendCallEmail({
          react: React.createElement(SponsorClaimNoticeEmail, {
            ritualName: ritual.name,
            ritualLogoUrl: ritual.logoUrl,
            theme: ritual.theme,
            placeholderName: placeholderName ?? 'a placeholder',
            claimedByName: session.user.name ?? null,
            claimedByEmail: session.user.email ?? '(no email)',
            ritualUrl: `${appUrl}/${ritual.slug}`,
          }),
          subject: `Someone stepped in as ${placeholderName ?? 'a placeholder'} — ${ritual.name}`,
          mode: { kind: 'send', to: [sponsor.email] },
          log: {
            ritualId: ritual.id,
            eventId: null,
            stage: 0,
            variant: 'sponsor_claim_notice',
            triggeredBy: 'system',
          },
          tags: [{ name: 'kind', value: 'sponsor_claim_notice' }],
        })
      }
    }
  } catch (e) {
    console.error('[claim] sponsor notice failed', e)
  }

  redirect(`/${ritualSlug}`)
}

/**
 * "None of these — I'm new." Promotes the signed-in user to a full crew member
 * of the ritual via the read-only token. Mirrors joinRitual but takes the
 * read-only token, since that's the URL the share link uses.
 */
export async function joinFreshFromShareLink(token: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq: e }) => e(r.readOnlyToken, token),
  })
  if (!ritual) throw new Error('Invalid share link')

  const existing = await db.query.ritualMembers.findFirst({
    where: (rm, { and: a, eq: e }) =>
      a(e(rm.ritualId, ritual.id), e(rm.userId, session.user!.id!)),
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
