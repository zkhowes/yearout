'use server'

import { auth } from '@/auth'
import { db } from '@/db'
import { buildInvitePlaceholder } from '@/lib/call/content'
import { generateCallCopy, fallbackCopy } from '@/lib/ai/call-copy'
import { renderCallElement, variantToStage } from '@/lib/call/render'
import { sendCallEmail } from '@/lib/email/send'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'

export async function sendInviteEmail(memberId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { eq: e }) => e(rm.id, memberId),
  })
  if (!member) throw new Error('Member not found')
  if (!member.isPlaceholder) throw new Error('Not a placeholder')

  // Sponsor check
  const sponsor = await db.query.ritualMembers.findFirst({
    where: (rm, { and: a, eq: e }) =>
      a(e(rm.ritualId, member.ritualId), e(rm.userId, session.user!.id!), e(rm.role, 'sponsor')),
  })
  if (!sponsor) throw new Error('Only the sponsor can send invites')

  const stub = await db.query.users.findFirst({
    where: (u, { eq: e }) => e(u.id, member.userId),
    columns: { email: true },
  })
  if (!stub?.email || stub.email.endsWith('@placeholder.yearout.local')) {
    throw new Error('This placeholder has no email')
  }

  const content = await buildInvitePlaceholder(member.id, APP_URL)
  if (!content) throw new Error('Could not build invite content')

  let copy
  try {
    copy = await generateCallCopy(content)
  } catch {
    copy = fallbackCopy(content)
  }

  const result = await sendCallEmail({
    react: renderCallElement(content, copy),
    subject: copy.subject || `Step into ${content.ritual.name}`,
    mode: { kind: 'send', to: [stub.email] },
    log: {
      ritualId: member.ritualId,
      eventId: null,
      stage: variantToStage(content.variant),
      variant: content.variant,
      aiCopy: copy,
      triggeredBy: 'sponsor',
    },
    tags: [{ name: 'variant', value: content.variant }],
  })

  if (result.error) throw new Error(result.error)
  return { ok: true }
}
