import * as React from 'react'
import { db } from '@/db'
import { sendCallEmail } from '@/lib/email/send'
import { SponsorClaimNoticeEmail } from '@/emails/SponsorClaimNotice'

export async function sendSponsorClaimNotice(args: {
  ritualId: string
  placeholderName: string | null
  claimedByName: string | null
  claimedByEmail: string
}) {
  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq: e }) => e(r.id, args.ritualId),
  })
  if (!ritual) return
  const sponsor = await db.query.users.findFirst({
    where: (u, { eq: e }) => e(u.id, ritual.sponsorId),
    columns: { email: true },
  })
  if (!sponsor?.email || sponsor.email.endsWith('@placeholder.yearout.local')) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yearout.zkhowes.fun'
  await sendCallEmail({
    react: React.createElement(SponsorClaimNoticeEmail, {
      ritualName: ritual.name,
      ritualLogoUrl: ritual.logoUrl,
      theme: ritual.theme,
      placeholderName: args.placeholderName ?? 'a placeholder',
      claimedByName: args.claimedByName,
      claimedByEmail: args.claimedByEmail,
      ritualUrl: `${appUrl}/${ritual.slug}`,
    }),
    subject: `Someone stepped in as ${args.placeholderName ?? 'a placeholder'} — ${ritual.name}`,
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
