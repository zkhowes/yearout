'use server'

import { auth } from '@/auth'
import { db } from '@/db'
import { rituals, events } from '@/db/schema'
import { asc, desc, eq } from 'drizzle-orm'
import {
  buildStage1ColdStart,
  buildStage1Ongoing,
  buildStage2Vote,
  buildStage3Confirmed,
  buildStage3aCommit,
  buildStage3bPackList,
  buildStage4InTrip,
  buildStage5Closeout,
  buildStage6Mythology,
  loadRecipients,
  type CallContent,
  type CallVariant,
} from '@/lib/call/content'
import { generateCallCopy, fallbackCopy, type AiCopy } from '@/lib/ai/call-copy'
import { renderCallElement, variantToStage } from '@/lib/call/render'
import { sendCallEmail } from '@/lib/email/send'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'

export interface RitualOption {
  id: string
  name: string
  slug: string
  theme: string
  activityType: string
  eventCount: number
}

export async function listRituals(): Promise<RitualOption[]> {
  const rows = await db
    .select({
      id: rituals.id,
      name: rituals.name,
      slug: rituals.slug,
      theme: rituals.theme,
      activityType: rituals.activityType,
    })
    .from(rituals)
    .orderBy(asc(rituals.name))

  // event counts in a single query
  const counts = new Map<string, number>()
  for (const r of rows) {
    const ec = await db.select({ id: events.id }).from(events).where(eq(events.ritualId, r.id))
    counts.set(r.id, ec.length)
  }

  return rows.map((r) => ({
    ...r,
    eventCount: counts.get(r.id) ?? 0,
  }))
}

export interface EventOption {
  id: string
  name: string
  year: number
  status: string
}

export async function listEvents(ritualId: string): Promise<EventOption[]> {
  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      year: events.year,
      status: events.status,
    })
    .from(events)
    .where(eq(events.ritualId, ritualId))
    .orderBy(desc(events.year))
  return rows
}

export interface BuildResult {
  variant: CallVariant
  content: CallContent | null
  copy: AiCopy | null
  html: string | null
  recipients: string[]
  error: string | null
}

/** Build a fully-rendered preview for the harness. Always preview-mode (no send). */
export async function buildPreview(input: {
  variant: CallVariant
  ritualId: string
  eventId?: string | null
  recipientUserId?: string | null
  regenerateCopy?: boolean
}): Promise<BuildResult> {
  const session = await auth()
  if (!session?.user?.email) {
    return {
      variant: input.variant,
      content: null,
      copy: null,
      html: null,
      recipients: [],
      error: 'Unauthorized',
    }
  }

  let content: CallContent | null = null
  try {
    switch (input.variant) {
      case 'stage1_cold_start':
        content = await buildStage1ColdStart(input.ritualId, APP_URL)
        break
      case 'stage1_ongoing':
        content = await buildStage1Ongoing(input.ritualId, APP_URL)
        break
      case 'stage2_vote':
        if (!input.eventId) throw new Error('eventId required')
        content = await buildStage2Vote(input.eventId, APP_URL)
        break
      case 'stage3_confirmed':
        if (!input.eventId) throw new Error('eventId required')
        content = await buildStage3Confirmed(input.eventId, APP_URL)
        break
      case 'stage3a_commit':
        if (!input.eventId || !input.recipientUserId) {
          throw new Error('eventId and recipientUserId required')
        }
        content = await buildStage3aCommit(
          input.eventId,
          input.recipientUserId,
          APP_URL
        )
        break
      case 'stage3b_pack_list':
        if (!input.eventId) throw new Error('eventId required')
        content = await buildStage3bPackList(input.eventId, APP_URL)
        break
      case 'stage4_in_trip':
        if (!input.eventId) throw new Error('eventId required')
        content = await buildStage4InTrip(input.eventId, APP_URL)
        break
      case 'stage5_closeout':
        if (!input.eventId) throw new Error('eventId required')
        content = await buildStage5Closeout(
          input.eventId,
          input.recipientUserId ?? null,
          APP_URL
        )
        break
      case 'stage6_mythology':
        if (!input.eventId) throw new Error('eventId required')
        content = await buildStage6Mythology(input.eventId, APP_URL)
        break
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to build content'
    return {
      variant: input.variant,
      content: null,
      copy: null,
      html: null,
      recipients: [],
      error: msg,
    }
  }

  if (!content) {
    return {
      variant: input.variant,
      content: null,
      copy: null,
      html: null,
      recipients: [],
      error: 'Could not build content for this variant + selection',
    }
  }

  let copy: AiCopy
  try {
    copy = await generateCallCopy(content)
  } catch (e: unknown) {
    console.error('[admin the-call] AI copy failed', e)
    copy = fallbackCopy(content)
  }

  const ritualId =
    'ritual' in content ? content.ritual.id : content.event.ritualId
  const recipients = await loadRecipients(ritualId)

  const result = await sendCallEmail({
    react: renderCallElement(content, copy),
    subject: copy.subject || 'The Call',
    mode: { kind: 'preview' },
  })

  return {
    variant: input.variant,
    content,
    copy,
    html: result.html,
    recipients: recipients.emails,
    error: null,
  }
}

/** Send a preview to a single test address. */
export async function sendTestEmail(input: {
  variant: CallVariant
  ritualId: string
  eventId?: string | null
  recipientUserId?: string | null
  testAddress: string
}): Promise<{ ok: boolean; resendId?: string; error?: string }> {
  const session = await auth()
  if (!session?.user?.email) return { ok: false, error: 'Unauthorized' }

  const built = await buildPreview({
    variant: input.variant,
    ritualId: input.ritualId,
    eventId: input.eventId,
    recipientUserId: input.recipientUserId,
  })
  if (built.error || !built.content || !built.copy) {
    return { ok: false, error: built.error || 'Build failed' }
  }

  const ritualId =
    'ritual' in built.content
      ? built.content.ritual.id
      : built.content.event.ritualId
  const eventId =
    'event' in built.content ? built.content.event.id : null

  const result = await sendCallEmail({
    react: renderCallElement(built.content, built.copy),
    subject: built.copy.subject || 'The Call',
    mode: { kind: 'send', to: [input.testAddress] },
    log: {
      ritualId,
      eventId,
      stage: variantToStage(built.content.variant),
      variant: built.content.variant,
      aiCopy: built.copy,
      triggeredBy: 'admin',
    },
    tags: [
      { name: 'env', value: 'admin-test' },
      { name: 'variant', value: built.content.variant },
    ],
  })

  return result.error
    ? { ok: false, error: result.error }
    : { ok: true, resendId: result.resendId }
}

/** Force-send to the entire crew. Bypasses rate limits (admin override). */
export async function sendToCrew(input: {
  variant: CallVariant
  ritualId: string
  eventId?: string | null
  recipientUserId?: string | null
}): Promise<{ ok: boolean; resendId?: string; recipientCount?: number; error?: string }> {
  const session = await auth()
  if (!session?.user?.email) return { ok: false, error: 'Unauthorized' }

  const built = await buildPreview({
    variant: input.variant,
    ritualId: input.ritualId,
    eventId: input.eventId,
    recipientUserId: input.recipientUserId,
  })
  if (built.error || !built.content || !built.copy) {
    return { ok: false, error: built.error || 'Build failed' }
  }

  if (built.recipients.length === 0) {
    return { ok: false, error: 'No crew emails resolved for this ritual' }
  }

  const ritualId =
    'ritual' in built.content
      ? built.content.ritual.id
      : built.content.event.ritualId
  const eventId =
    'event' in built.content ? built.content.event.id : null

  const result = await sendCallEmail({
    react: renderCallElement(built.content, built.copy),
    subject: built.copy.subject || 'The Call',
    mode: { kind: 'send', to: built.recipients },
    log: {
      ritualId,
      eventId,
      stage: variantToStage(built.content.variant),
      variant: built.content.variant,
      aiCopy: built.copy,
      triggeredBy: 'admin',
    },
    tags: [
      { name: 'env', value: 'admin-crew' },
      { name: 'variant', value: built.content.variant },
    ],
  })

  return result.error
    ? { ok: false, error: result.error }
    : { ok: true, resendId: result.resendId, recipientCount: built.recipients.length }
}
