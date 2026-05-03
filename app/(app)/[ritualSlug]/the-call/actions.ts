'use server'

import { auth } from '@/auth'
import { db } from '@/db'
import { rituals, callSchedule } from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import {
  buildStage1ColdStart,
  buildStage1Ongoing,
  buildStage2Vote,
  buildStage3Confirmed,
  buildStage3bPackList,
  buildStage4InTrip,
  buildStage5Closeout,
  buildStage6Mythology,
  loadRecipients,
  loadRitualSnapshot,
  type CallContent,
  type CallVariant,
} from '@/lib/call/content'
import { generateCallCopy, fallbackCopy, type AiCopy } from '@/lib/ai/call-copy'
import { renderCallElement, variantToStage } from '@/lib/call/render'
import { sendCallEmail } from '@/lib/email/send'
import { checkCallRateLimits } from '@/lib/call/rate-limit'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'

async function requireSponsor(ritualSlug: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const ritual = await db.query.rituals.findFirst({
    where: eq(rituals.slug, ritualSlug),
  })
  if (!ritual) throw new Error('Ritual not found')
  if (ritual.sponsorId !== session.user.id) {
    throw new Error('Only the sponsor can manage The Call')
  }
  return ritual
}

async function buildContent(
  variant: CallVariant,
  ritualId: string,
  eventId: string | null
): Promise<CallContent | null> {
  switch (variant) {
    case 'stage1_cold_start':
      return buildStage1ColdStart(ritualId, APP_URL)
    case 'stage1_ongoing':
      return buildStage1Ongoing(ritualId, APP_URL)
    case 'stage2_vote':
      return eventId ? buildStage2Vote(eventId, APP_URL) : null
    case 'stage3_confirmed':
      return eventId ? buildStage3Confirmed(eventId, APP_URL) : null
    case 'stage3b_pack_list':
      return eventId ? buildStage3bPackList(eventId, APP_URL) : null
    case 'stage4_in_trip':
      return eventId ? buildStage4InTrip(eventId, APP_URL) : null
    case 'stage5_closeout':
      return eventId ? buildStage5Closeout(eventId, null, APP_URL) : null
    case 'stage6_mythology':
      return eventId ? buildStage6Mythology(eventId, APP_URL) : null
    case 'stage3a_commit':
      return null // 3a is per-recipient — handled separately
  }
}

/** Sponsor manually triggers a Stage 1 send (creates a draft for review). */
export async function sponsorTriggerSummons(ritualSlug: string) {
  const ritual = await requireSponsor(ritualSlug)
  const snapshot = await loadRitualSnapshot(ritual.id)
  if (!snapshot) throw new Error('Could not load ritual snapshot')

  const variant: CallVariant =
    snapshot.mode === 'cold_start' ? 'stage1_cold_start' : 'stage1_ongoing'

  // Rate limit guard
  const verdict = await checkCallRateLimits({
    variant,
    ritualId: ritual.id,
    triggeredBy: 'sponsor',
  })
  if (!verdict.allowed) {
    throw new Error(verdict.reason || 'Rate limit exceeded')
  }

  await db.insert(callSchedule).values({
    id: crypto.randomUUID(),
    ritualId: ritual.id,
    eventId: null,
    stage: 1,
    variant,
    scheduledFor: new Date(),
    status: 'draft',
    triggeredBy: 'sponsor',
    createdAt: new Date(),
  })

  revalidatePath(`/${ritualSlug}/the-call`)
}

export interface DraftPreview {
  id: string
  variant: CallVariant
  eventId: string | null
  stage: number
  status: string
  triggeredBy: string
  createdAt: Date
  html: string | null
  subject: string | null
  recipientCount: number
  error: string | null
}

export async function listDrafts(ritualSlug: string): Promise<DraftPreview[]> {
  const ritual = await requireSponsor(ritualSlug)
  const drafts = await db
    .select()
    .from(callSchedule)
    .where(
      and(
        eq(callSchedule.ritualId, ritual.id),
        eq(callSchedule.status, 'draft')
      )
    )
    .orderBy(desc(callSchedule.createdAt))
    .limit(20)

  const recipients = await loadRecipients(ritual.id)
  const out: DraftPreview[] = []
  for (const d of drafts) {
    let html: string | null = null
    let subject: string | null = null
    let error: string | null = null
    try {
      const content = await buildContent(
        d.variant as CallVariant,
        ritual.id,
        d.eventId
      )
      if (!content) {
        error = 'Could not build content'
      } else {
        let copy: AiCopy
        try {
          copy = await generateCallCopy(content)
        } catch {
          copy = fallbackCopy(content)
        }
        const result = await sendCallEmail({
          react: renderCallElement(content, copy),
          subject: copy.subject || 'The Call',
          mode: { kind: 'preview' },
        })
        html = result.html
        subject = copy.subject
      }
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Preview failed'
    }
    out.push({
      id: d.id,
      variant: d.variant as CallVariant,
      eventId: d.eventId,
      stage: d.stage,
      status: d.status,
      triggeredBy: d.triggeredBy,
      createdAt: d.createdAt,
      html,
      subject,
      recipientCount: recipients.emails.length,
      error,
    })
  }
  return out
}

export async function sendDraft(ritualSlug: string, draftId: string) {
  const ritual = await requireSponsor(ritualSlug)
  const draft = await db.query.callSchedule.findFirst({
    where: eq(callSchedule.id, draftId),
  })
  if (!draft || draft.ritualId !== ritual.id) throw new Error('Draft not found')

  const verdict = await checkCallRateLimits({
    variant: draft.variant as CallVariant,
    ritualId: ritual.id,
    triggeredBy: 'sponsor',
  })
  if (!verdict.allowed) throw new Error(verdict.reason || 'Rate limit exceeded')

  const content = await buildContent(
    draft.variant as CallVariant,
    ritual.id,
    draft.eventId
  )
  if (!content) throw new Error('Could not build content')

  let copy: AiCopy
  try {
    copy = await generateCallCopy(content)
  } catch {
    copy = fallbackCopy(content)
  }

  const recipients = await loadRecipients(ritual.id)
  if (recipients.emails.length === 0) throw new Error('No recipients')

  const result = await sendCallEmail({
    react: renderCallElement(content, copy),
    subject: copy.subject || 'The Call',
    mode: { kind: 'send', to: recipients.emails },
    log: {
      ritualId: ritual.id,
      eventId: draft.eventId,
      stage: variantToStage(content.variant),
      variant: content.variant,
      aiCopy: copy,
      triggeredBy: 'sponsor',
    },
    tags: [
      { name: 'env', value: 'sponsor' },
      { name: 'variant', value: content.variant },
    ],
  })

  if (result.error) throw new Error(result.error)

  await db
    .update(callSchedule)
    .set({ status: 'sent' })
    .where(eq(callSchedule.id, draftId))

  revalidatePath(`/${ritualSlug}/the-call`)
}

export async function cancelDraft(ritualSlug: string, draftId: string) {
  const ritual = await requireSponsor(ritualSlug)
  await db
    .update(callSchedule)
    .set({ status: 'cancelled' })
    .where(and(eq(callSchedule.id, draftId), eq(callSchedule.ritualId, ritual.id)))
  revalidatePath(`/${ritualSlug}/the-call`)
}

export async function snoozeDraft(ritualSlug: string, draftId: string) {
  const ritual = await requireSponsor(ritualSlug)
  // Cancel current, will be re-drafted by cron in 7 days if conditions still hold
  await db
    .update(callSchedule)
    .set({ status: 'cancelled' })
    .where(and(eq(callSchedule.id, draftId), eq(callSchedule.ritualId, ritual.id)))
  revalidatePath(`/${ritualSlug}/the-call`)
}

export interface RateMeter {
  monthlyUsed: number
  monthlyLimit: number
  stage1Used: number
  stage1Limit: number
}

export async function getRateMeter(ritualSlug: string): Promise<RateMeter> {
  const ritual = await requireSponsor(ritualSlug)
  const monthly = await checkCallRateLimits({
    variant: 'stage2_vote',
    ritualId: ritual.id,
    triggeredBy: 'sponsor',
  })
  const stage1 = await checkCallRateLimits({
    variant: 'stage1_ongoing',
    ritualId: ritual.id,
    triggeredBy: 'sponsor',
  })
  return {
    monthlyUsed: monthly.meter?.used ?? 0,
    monthlyLimit: monthly.meter?.limit ?? 4,
    stage1Used: stage1.meter?.used ?? 0,
    stage1Limit: stage1.meter?.limit ?? 1,
  }
}
