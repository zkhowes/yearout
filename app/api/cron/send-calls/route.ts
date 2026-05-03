import { NextResponse } from 'next/server'
import { db } from '@/db'
import { rituals, events, eventAttendees, callSchedule } from '@/db/schema'
import { and, eq, gte } from 'drizzle-orm'

const dayMs = 24 * 60 * 60 * 1000

/**
 * Daily cron at 07:00. Drafts upcoming Call emails into call_schedule. Never
 * sends — Sponsor approves drafts via /[ritualSlug]/the-call.
 *
 * Drafted variants:
 *   - stage1_ongoing: ~6 months before ritual.typicalMonth, when no event in planning/scheduled
 *   - stage3a_commit: per uncommitted attendee, weekly cadence within 30 days of startDate
 *   - stage3b_pack_list: 7-14 days before startDate
 *   - stage4_in_trip: daily during in_progress
 *   - stage6_mythology: 30 days after sealedAt
 *
 * Stage 5 (closeout) is handled by event-status cron on auto-conclude.
 * Stage 1 cold_start is sponsor-triggered only (no cron — these crews have no
 * history to summon nostalgia from).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const drafts: { ritualId: string; variant: string; eventId?: string; recipientUserId?: string }[] = []

  // ============ Stage 1 Ongoing ============
  // Find rituals with typicalMonth set, with at least one past event, and no
  // event currently in planning/scheduled. Fire when we're ~6 months ahead of
  // the typical month (rough — month-name match within tolerance).
  const monthIdx: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  }
  const allRituals = await db.select().from(rituals)
  for (const r of allRituals) {
    if (!r.typicalMonth) continue
    const tIdx = monthIdx[r.typicalMonth.toLowerCase()]
    if (tIdx == null) continue

    // Are we ~6 months out (with ±15 day tolerance)?
    const targetMonth = (now.getMonth() + 6) % 12
    if (targetMonth !== tIdx) continue

    const ritualEvents = await db
      .select({ id: events.id, status: events.status })
      .from(events)
      .where(eq(events.ritualId, r.id))
    if (ritualEvents.length === 0) continue // skip cold-start (no nostalgia source)
    const inFlight = ritualEvents.some(
      (e) => e.status === 'planning' || e.status === 'scheduled' || e.status === 'in_progress'
    )
    if (inFlight) continue

    // Don't draft if a draft already exists for this ritual + variant in last 30d
    const existing = await db
      .select({ id: callSchedule.id })
      .from(callSchedule)
      .where(
        and(
          eq(callSchedule.ritualId, r.id),
          eq(callSchedule.variant, 'stage1_ongoing'),
          gte(callSchedule.createdAt, new Date(now.getTime() - 30 * dayMs))
        )
      )
    if (existing.length > 0) continue

    drafts.push({ ritualId: r.id, variant: 'stage1_ongoing' })
  }

  // ============ Stage 3a + 3b on scheduled events ============
  const scheduledEvents = await db
    .select({
      id: events.id,
      ritualId: events.ritualId,
      startDate: events.startDate,
    })
    .from(events)
    .where(eq(events.status, 'scheduled'))

  for (const ev of scheduledEvents) {
    if (!ev.startDate) continue
    const daysUntil = Math.ceil((ev.startDate.getTime() - now.getTime()) / dayMs)

    // 3b — pack list, fired once when 7 to 14 days out
    if (daysUntil >= 7 && daysUntil <= 14) {
      const existing = await db
        .select({ id: callSchedule.id })
        .from(callSchedule)
        .where(
          and(
            eq(callSchedule.eventId, ev.id),
            eq(callSchedule.variant, 'stage3b_pack_list')
          )
        )
      if (existing.length === 0) {
        drafts.push({
          ritualId: ev.ritualId,
          eventId: ev.id,
          variant: 'stage3b_pack_list',
        })
      }
    }

    // 3a — commit reminder per uncommitted attendee, weekly within 30 days
    if (daysUntil <= 30 && daysUntil >= 0) {
      const uncommitted = await db
        .select({ userId: eventAttendees.userId })
        .from(eventAttendees)
        .where(
          and(
            eq(eventAttendees.eventId, ev.id),
            eq(eventAttendees.bookingStatus, 'not_yet')
          )
        )
      for (const a of uncommitted) {
        // Don't double-draft: skip if a 3a draft exists for this event+user in last 7d
        const existing = await db
          .select({ id: callSchedule.id })
          .from(callSchedule)
          .where(
            and(
              eq(callSchedule.eventId, ev.id),
              eq(callSchedule.variant, 'stage3a_commit'),
              gte(callSchedule.createdAt, new Date(now.getTime() - 7 * dayMs))
            )
          )
        if (existing.length === 0) {
          drafts.push({
            ritualId: ev.ritualId,
            eventId: ev.id,
            recipientUserId: a.userId,
            variant: 'stage3a_commit',
          })
        }
      }
    }
  }

  // ============ Stage 4 in-trip pulses ============
  const liveEvents = await db
    .select({ id: events.id, ritualId: events.ritualId })
    .from(events)
    .where(eq(events.status, 'in_progress'))

  for (const ev of liveEvents) {
    const existing = await db
      .select({ id: callSchedule.id })
      .from(callSchedule)
      .where(
        and(
          eq(callSchedule.eventId, ev.id),
          eq(callSchedule.variant, 'stage4_in_trip'),
          gte(callSchedule.createdAt, new Date(now.getTime() - dayMs))
        )
      )
    if (existing.length === 0) {
      drafts.push({
        ritualId: ev.ritualId,
        eventId: ev.id,
        variant: 'stage4_in_trip',
      })
    }
  }

  // ============ Stage 6 mythology ============
  // 30 days after sealedAt
  const closedEvents = await db
    .select({
      id: events.id,
      ritualId: events.ritualId,
      sealedAt: events.sealedAt,
    })
    .from(events)
    .where(eq(events.status, 'closed'))

  for (const ev of closedEvents) {
    if (!ev.sealedAt) continue
    const daysSince = Math.floor((now.getTime() - ev.sealedAt.getTime()) / dayMs)
    if (daysSince < 30 || daysSince > 60) continue

    const existing = await db
      .select({ id: callSchedule.id })
      .from(callSchedule)
      .where(
        and(
          eq(callSchedule.eventId, ev.id),
          eq(callSchedule.variant, 'stage6_mythology')
        )
      )
    if (existing.length === 0) {
      drafts.push({
        ritualId: ev.ritualId,
        eventId: ev.id,
        variant: 'stage6_mythology',
      })
    }
  }

  // Persist drafts
  for (const d of drafts) {
    await db.insert(callSchedule).values({
      id: crypto.randomUUID(),
      ritualId: d.ritualId,
      eventId: d.eventId ?? null,
      stage: stageNumber(d.variant),
      variant: d.variant,
      scheduledFor: new Date(now.getTime() + dayMs),
      status: 'draft',
      triggeredBy: 'cron',
      createdAt: now,
    })
  }

  return NextResponse.json({
    draftsCreated: drafts.length,
    breakdown: drafts.reduce<Record<string, number>>((acc, d) => {
      acc[d.variant] = (acc[d.variant] ?? 0) + 1
      return acc
    }, {}),
  })
}

function stageNumber(variant: string): number {
  switch (variant) {
    case 'stage1_cold_start':
    case 'stage1_ongoing':
      return 1
    case 'stage2_vote':
      return 2
    case 'stage3_confirmed':
      return 3
    case 'stage3a_commit':
      return 31
    case 'stage3b_pack_list':
      return 32
    case 'stage4_in_trip':
      return 4
    case 'stage5_closeout':
      return 5
    case 'stage6_mythology':
      return 6
    default:
      return 0
  }
}
