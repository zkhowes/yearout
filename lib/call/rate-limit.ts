// Rate limits for The Call. Surfaced as a meter in the sponsor UI so the rule
// is visible *before* it bites. Admin force-sends bypass everything.

import { db } from '@/db'
import { callSends } from '@/db/schema'
import { and, eq, gte, sql } from 'drizzle-orm'

export interface RateLimitVerdict {
  allowed: boolean
  reason?: string
  meter?: { used: number; limit: number; window: string }
}

const dayMs = 24 * 60 * 60 * 1000

/**
 * Per ritual: max 1 Stage 1 send per 14 days.
 */
export async function checkStage1RitualLimit(
  ritualId: string,
  triggeredBy: 'cron' | 'sponsor' | 'admin'
): Promise<RateLimitVerdict> {
  if (triggeredBy === 'admin') return { allowed: true }
  const since = new Date(Date.now() - 14 * dayMs)
  const rows = await db
    .select({ id: callSends.id })
    .from(callSends)
    .where(
      and(
        eq(callSends.ritualId, ritualId),
        eq(callSends.stage, 1),
        gte(callSends.sentAt, since)
      )
    )
  const used = rows.length
  if (used >= 1) {
    return {
      allowed: false,
      reason:
        'You sent The Summons already this fortnight. Let it breathe — try a Smart Share Link instead.',
      meter: { used, limit: 1, window: '14 days' },
    }
  }
  return { allowed: true, meter: { used, limit: 1, window: '14 days' } }
}

/**
 * Per ritual: max 4 total Call emails per 30 days across all stages.
 */
export async function checkRitualMonthlyLimit(
  ritualId: string,
  triggeredBy: 'cron' | 'sponsor' | 'admin'
): Promise<RateLimitVerdict> {
  if (triggeredBy === 'admin') return { allowed: true }
  const since = new Date(Date.now() - 30 * dayMs)
  const rows = await db
    .select({ id: callSends.id })
    .from(callSends)
    .where(and(eq(callSends.ritualId, ritualId), gte(callSends.sentAt, since)))
  const used = rows.length
  if (used >= 4) {
    return {
      allowed: false,
      reason:
        '4 calls this month. The crew will start ignoring them. Take a beat.',
      meter: { used, limit: 4, window: '30 days' },
    }
  }
  return { allowed: true, meter: { used, limit: 4, window: '30 days' } }
}

/**
 * Per recipient: max 1 Stage 3a per 7 days.
 * Recipient is identified by email (since call_sends.recipients is an email array).
 */
export async function checkStage3aRecipientLimit(
  ritualId: string,
  recipientEmail: string,
  triggeredBy: 'cron' | 'sponsor' | 'admin'
): Promise<RateLimitVerdict> {
  if (triggeredBy === 'admin') return { allowed: true }
  const since = new Date(Date.now() - 7 * dayMs)
  // recipients is JSONB; use containment check
  const rows = await db
    .select({ id: callSends.id })
    .from(callSends)
    .where(
      and(
        eq(callSends.ritualId, ritualId),
        eq(callSends.stage, 31),
        gte(callSends.sentAt, since),
        sql`${callSends.recipients} @> ${JSON.stringify([recipientEmail])}::jsonb`
      )
    )
  const used = rows.length
  if (used >= 1) {
    return {
      allowed: false,
      reason: `${recipientEmail} got nudged in the last week — give them air.`,
      meter: { used, limit: 1, window: '7 days' },
    }
  }
  return { allowed: true, meter: { used, limit: 1, window: '7 days' } }
}

/**
 * Per recipient: max 1 in-trip pulse per day during in_progress.
 */
export async function checkInTripDailyLimit(
  ritualId: string,
  recipientEmail: string,
  triggeredBy: 'cron' | 'sponsor' | 'admin'
): Promise<RateLimitVerdict> {
  if (triggeredBy === 'admin') return { allowed: true }
  const since = new Date(Date.now() - dayMs)
  const rows = await db
    .select({ id: callSends.id })
    .from(callSends)
    .where(
      and(
        eq(callSends.ritualId, ritualId),
        eq(callSends.stage, 4),
        gte(callSends.sentAt, since),
        sql`${callSends.recipients} @> ${JSON.stringify([recipientEmail])}::jsonb`
      )
    )
  const used = rows.length
  if (used >= 1) {
    return {
      allowed: false,
      reason: `Already pulsed ${recipientEmail} today.`,
      meter: { used, limit: 1, window: '24 hours' },
    }
  }
  return { allowed: true, meter: { used, limit: 1, window: '24 hours' } }
}

/**
 * Compose the right limit checks for a given variant. Used as a single guard
 * before any non-admin send.
 */
export async function checkCallRateLimits(input: {
  variant:
    | 'stage1_cold_start'
    | 'stage1_ongoing'
    | 'stage2_vote'
    | 'stage3_confirmed'
    | 'stage3a_commit'
    | 'stage3b_pack_list'
    | 'stage4_in_trip'
    | 'stage5_closeout'
    | 'stage6_mythology'
  ritualId: string
  recipientEmail?: string
  triggeredBy: 'cron' | 'sponsor' | 'admin'
}): Promise<RateLimitVerdict> {
  // Monthly cap applies to everything
  const monthly = await checkRitualMonthlyLimit(input.ritualId, input.triggeredBy)
  if (!monthly.allowed) return monthly

  if (input.variant === 'stage1_cold_start' || input.variant === 'stage1_ongoing') {
    return checkStage1RitualLimit(input.ritualId, input.triggeredBy)
  }
  if (input.variant === 'stage3a_commit' && input.recipientEmail) {
    return checkStage3aRecipientLimit(
      input.ritualId,
      input.recipientEmail,
      input.triggeredBy
    )
  }
  if (input.variant === 'stage4_in_trip' && input.recipientEmail) {
    return checkInTripDailyLimit(input.ritualId, input.recipientEmail, input.triggeredBy)
  }
  return { allowed: true }
}
