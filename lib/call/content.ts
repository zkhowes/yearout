// Content builders for The Call email variants.
// Each function reads from the DB and returns a plain object that the matching
// React Email template + AI copy module can consume. No AI calls here, no
// rendering — just data assembly.

import { db } from '@/db'
import {
  rituals,
  events,
  ritualMembers,
  eventAttendees,
  loreEntries,
  awards,
  expenses,
  dailyItinerary,
  ritualAwardDefinitions,
  users,
} from '@/db/schema'
import { and, desc, eq, inArray } from 'drizzle-orm'

export type CallVariant =
  | 'stage1_cold_start'
  | 'stage1_ongoing'
  | 'stage2_vote'
  | 'stage3_confirmed'
  | 'stage3a_commit'
  | 'stage3b_pack_list'
  | 'stage4_in_trip'
  | 'stage5_closeout'
  | 'stage6_mythology'

export interface RitualSnapshot {
  id: string
  name: string
  slug: string
  theme: string
  activityType: string
  tagline: string | null
  logoUrl: string | null
  foundingYear: string | null
  typicalMonth: string | null
  yearsRun: number
  mode: 'cold_start' | 'ongoing'
}

export async function loadRitualSnapshot(ritualId: string): Promise<RitualSnapshot | null> {
  const ritual = await db.query.rituals.findFirst({ where: eq(rituals.id, ritualId) })
  if (!ritual) return null

  const evCount = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.ritualId, ritualId))

  const yearsRun = evCount.length
  const mode: RitualSnapshot['mode'] = yearsRun === 0 ? 'cold_start' : 'ongoing'

  return {
    id: ritual.id,
    name: ritual.name,
    slug: ritual.slug,
    theme: ritual.theme,
    activityType: ritual.activityType,
    tagline: ritual.tagline,
    logoUrl: ritual.logoUrl,
    foundingYear: ritual.foundingYear,
    typicalMonth: ritual.typicalMonth,
    yearsRun,
    mode,
  }
}

export interface RecipientList {
  emails: string[]
  count: number
  vocative: 'crew' | 'boys' | 'ladies' | 'team'
}

/** Resolve all crew members of a ritual to their email addresses. */
export async function loadRecipients(ritualId: string): Promise<RecipientList> {
  const rows = await db
    .select({ email: users.email })
    .from(ritualMembers)
    .innerJoin(users, eq(ritualMembers.userId, users.id))
    .where(eq(ritualMembers.ritualId, ritualId))

  const emails = rows.map((r) => r.email).filter((e): e is string => !!e)
  // Vocative left at 'crew' for v1 — gender-aware heuristic deferred
  return { emails, count: emails.length, vocative: 'crew' }
}

/* ============================================================
 * Stage 1 — Cold Start (no events yet)
 * ============================================================ */
export interface Stage1ColdStartContent {
  variant: 'stage1_cold_start'
  ritual: RitualSnapshot
  ctaUrl: string
}

export async function buildStage1ColdStart(
  ritualId: string,
  appUrl: string
): Promise<Stage1ColdStartContent | null> {
  const ritual = await loadRitualSnapshot(ritualId)
  if (!ritual) return null
  return {
    variant: 'stage1_cold_start',
    ritual,
    ctaUrl: `${appUrl}/${ritual.slug}/new-event?mode=call`,
  }
}

/* ============================================================
 * Stage 1 — Ongoing (nostalgia from past events)
 * ============================================================ */
export interface Stage1OngoingContent {
  variant: 'stage1_ongoing'
  ritual: RitualSnapshot
  lastEvent: {
    name: string
    year: number
    location: string | null
    coverPhotoUrl: string | null
  } | null
  lastMvp: { displayName: string; awardName: string } | null
  hofLore: { mediaUrl: string | null; content: string | null; type: string } | null
  ctaUrl: string
}

export async function buildStage1Ongoing(
  ritualId: string,
  appUrl: string
): Promise<Stage1OngoingContent | null> {
  const ritual = await loadRitualSnapshot(ritualId)
  if (!ritual || ritual.mode !== 'ongoing') return null

  const last = await db.query.events.findFirst({
    where: eq(events.ritualId, ritualId),
    orderBy: [desc(events.year)],
  })

  let lastMvp: Stage1OngoingContent['lastMvp'] = null
  let hofLore: Stage1OngoingContent['hofLore'] = null

  if (last) {
    const mvpRow = await db
      .select({
        nominee: users.name,
        awardName: ritualAwardDefinitions.name,
        type: ritualAwardDefinitions.type,
      })
      .from(awards)
      .innerJoin(users, eq(awards.winnerId, users.id))
      .innerJoin(
        ritualAwardDefinitions,
        eq(awards.awardDefinitionId, ritualAwardDefinitions.id)
      )
      .where(and(eq(awards.eventId, last.id), eq(ritualAwardDefinitions.type, 'mvp')))
      .limit(1)
    if (mvpRow[0]) {
      lastMvp = { displayName: mvpRow[0].nominee || 'the crew', awardName: mvpRow[0].awardName }
    }

    // Pull all events for this ritual to find the most recent HOF lore
    const allEventIds = (
      await db.select({ id: events.id }).from(events).where(eq(events.ritualId, ritualId))
    ).map((e) => e.id)

    if (allEventIds.length > 0) {
      const lore = await db
        .select({
          mediaUrl: loreEntries.mediaUrl,
          content: loreEntries.content,
          type: loreEntries.type,
        })
        .from(loreEntries)
        .where(
          and(
            inArray(loreEntries.eventId, allEventIds),
            eq(loreEntries.isHallOfFame, true)
          )
        )
        .orderBy(desc(loreEntries.createdAt))
        .limit(1)
      if (lore[0]) hofLore = lore[0]
    }
  }

  return {
    variant: 'stage1_ongoing',
    ritual,
    lastEvent: last
      ? {
          name: last.name,
          year: last.year,
          location: last.location,
          coverPhotoUrl: last.coverPhotoUrl,
        }
      : null,
    lastMvp,
    hofLore,
    ctaUrl: `${appUrl}/${ritual.slug}/new-event?mode=call`,
  }
}

/* ============================================================
 * Shared: load event with ritual context
 * ============================================================ */
export interface EventSnapshot {
  id: string
  ritualId: string
  ritual: RitualSnapshot
  name: string
  year: number
  location: string | null
  startDate: Date | null
  endDate: Date | null
  status: string
}

async function loadEventSnapshot(eventId: string): Promise<EventSnapshot | null> {
  const ev = await db.query.events.findFirst({ where: eq(events.id, eventId) })
  if (!ev) return null
  const ritual = await loadRitualSnapshot(ev.ritualId)
  if (!ritual) return null
  return {
    id: ev.id,
    ritualId: ev.ritualId,
    ritual,
    name: ev.name,
    year: ev.year,
    location: ev.location,
    startDate: ev.startDate,
    endDate: ev.endDate,
    status: ev.status,
  }
}

/* ============================================================
 * Stage 2 — Vote (planning)
 * ============================================================ */
export interface Stage2VoteContent {
  variant: 'stage2_vote'
  event: EventSnapshot
  dateOptionsCount: number
  locationOptionsCount: number
  votesSoFar: number
  ctaUrl: string
}

export async function buildStage2Vote(
  eventId: string,
  appUrl: string
): Promise<Stage2VoteContent | null> {
  const event = await loadEventSnapshot(eventId)
  if (!event) return null

  // Cheap counts via the schema we already have
  const { callDateOptions, callLocationOptions, callVotes } = await import('@/db/schema')
  const dateOpts = await db.select({ id: callDateOptions.id }).from(callDateOptions).where(eq(callDateOptions.eventId, eventId))
  const locOpts = await db.select({ id: callLocationOptions.id }).from(callLocationOptions).where(eq(callLocationOptions.eventId, eventId))
  const voteRows = await db.select({ id: callVotes.id }).from(callVotes).where(eq(callVotes.eventId, eventId))

  return {
    variant: 'stage2_vote',
    event,
    dateOptionsCount: dateOpts.length,
    locationOptionsCount: locOpts.length,
    votesSoFar: voteRows.length,
    ctaUrl: `${appUrl}/${event.ritual.slug}/${event.year}`,
  }
}

/* ============================================================
 * Stage 3 — Confirmed (scheduled)
 * ============================================================ */
export interface Stage3ConfirmedContent {
  variant: 'stage3_confirmed'
  event: EventSnapshot
  committedCount: number
  totalAttendees: number
  airportHint: string | null
  ctaUrl: string
}

export async function buildStage3Confirmed(
  eventId: string,
  appUrl: string
): Promise<Stage3ConfirmedContent | null> {
  const event = await loadEventSnapshot(eventId)
  if (!event) return null

  const attendees = await db
    .select({ status: eventAttendees.bookingStatus })
    .from(eventAttendees)
    .where(eq(eventAttendees.eventId, eventId))

  const committedCount = attendees.filter(
    (a) => a.status && a.status !== 'not_yet'
  ).length

  // Airport hint — pulled from existing aiTips JSON if available
  const ev = await db.query.events.findFirst({ where: eq(events.id, eventId) })
  let airportHint: string | null = null
  if (ev?.aiTips) {
    try {
      const tips = JSON.parse(ev.aiTips) as unknown
      if (Array.isArray(tips)) {
        const airport = tips.find(
          (t) => typeof t === 'string' && /airport|fly into|nearest/i.test(t)
        )
        if (typeof airport === 'string') airportHint = airport
      }
    } catch {
      // ignore malformed JSON
    }
  }

  return {
    variant: 'stage3_confirmed',
    event,
    committedCount,
    totalAttendees: attendees.length,
    airportHint,
    ctaUrl: `${appUrl}/${event.ritual.slug}/${event.year}`,
  }
}

/* ============================================================
 * Stage 3a — Commit nudge (per-recipient)
 * ============================================================ */
export interface Stage3aCommitContent {
  variant: 'stage3a_commit'
  event: EventSnapshot
  recipient: { name: string; email: string }
  committedNames: string[]
  ctaUrl: string
}

export async function buildStage3aCommit(
  eventId: string,
  recipientUserId: string,
  appUrl: string
): Promise<Stage3aCommitContent | null> {
  const event = await loadEventSnapshot(eventId)
  if (!event) return null

  const recipient = await db.query.users.findFirst({
    where: eq(users.id, recipientUserId),
  })
  if (!recipient?.email) return null

  const committed = await db
    .select({ name: users.name })
    .from(eventAttendees)
    .innerJoin(users, eq(eventAttendees.userId, users.id))
    .where(eq(eventAttendees.eventId, eventId))

  const committedNames = committed
    .filter((c) => c.name)
    .map((c) => c.name as string)

  return {
    variant: 'stage3a_commit',
    event,
    recipient: { name: recipient.name || 'friend', email: recipient.email },
    committedNames,
    ctaUrl: `${appUrl}/${event.ritual.slug}/${event.year}`,
  }
}

/* ============================================================
 * Stage 3b — Pack List (7-14d before start)
 * ============================================================ */
export interface Stage3bPackListContent {
  variant: 'stage3b_pack_list'
  event: EventSnapshot
  daysUntil: number
  packListItems: string[]
  ctaUrl: string
}

const PACK_LIST_TEMPLATES: Record<string, string[]> = {
  ski: ['Lift pass', 'Goggles', 'Helmet', 'Base layers', 'Gloves', 'Passport (if international)'],
  golf: ['Clubs', 'Glove(s)', 'Balls', 'Spike-friendly shoes', 'Cap', 'Sunscreen'],
  mountain_biking: ['Bike or rental confirmation', 'Helmet', 'Gloves', 'Repair kit', 'Hydration pack'],
  fishing: ['Rod & reel', 'Tackle', 'License', 'Waders', 'Polarized sunglasses'],
  backpacking: ['Pack', 'Tent / shelter', 'Sleeping bag', 'Water filter', 'Permits'],
  family: ['ID for each family member', 'Snacks', 'Activities for kids', 'Chargers'],
  girls_trip: ['ID', 'Outfits per planned activity', 'Toiletries', 'Camera'],
  other: ['ID', 'Chargers', 'Toiletries', 'Layers'],
}

export async function buildStage3bPackList(
  eventId: string,
  appUrl: string,
  now: Date = new Date()
): Promise<Stage3bPackListContent | null> {
  const event = await loadEventSnapshot(eventId)
  if (!event || !event.startDate) return null

  const daysUntil = Math.max(
    0,
    Math.ceil((event.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  )
  const packListItems =
    PACK_LIST_TEMPLATES[event.ritual.activityType] || PACK_LIST_TEMPLATES.other

  return {
    variant: 'stage3b_pack_list',
    event,
    daysUntil,
    packListItems,
    ctaUrl: `${appUrl}/${event.ritual.slug}/${event.year}`,
  }
}

/* ============================================================
 * Stage 4 — In-Trip Pulse (during the trip)
 * ============================================================ */
export interface Stage4InTripContent {
  variant: 'stage4_in_trip'
  event: EventSnapshot
  dayOfTrip: number
  totalDays: number
  todayThemeName: string | null
  expenseRunningTotalCents: number
  recentLoreCount: number
  ctaUrl: string
}

export async function buildStage4InTrip(
  eventId: string,
  appUrl: string,
  now: Date = new Date()
): Promise<Stage4InTripContent | null> {
  const event = await loadEventSnapshot(eventId)
  if (!event || !event.startDate || !event.endDate) return null

  const dayMs = 1000 * 60 * 60 * 24
  const dayOfTrip = Math.max(
    1,
    Math.floor((now.getTime() - event.startDate.getTime()) / dayMs) + 1
  )
  const totalDays = Math.max(
    1,
    Math.ceil((event.endDate.getTime() - event.startDate.getTime()) / dayMs) + 1
  )

  // Today's theme from daily_itinerary
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const itinerary = await db
    .select({ themeName: dailyItinerary.themeName })
    .from(dailyItinerary)
    .where(
      and(eq(dailyItinerary.eventId, eventId), eq(dailyItinerary.day, todayStart))
    )
    .limit(1)

  // Running expense total
  const expenseRows = await db
    .select({ amount: expenses.amount })
    .from(expenses)
    .where(eq(expenses.eventId, eventId))
  const expenseRunningTotalCents = expenseRows.reduce(
    (sum, r) => sum + (r.amount ?? 0),
    0
  )

  const recent = await db
    .select({ id: loreEntries.id })
    .from(loreEntries)
    .where(eq(loreEntries.eventId, eventId))
  const recentLoreCount = recent.length

  return {
    variant: 'stage4_in_trip',
    event,
    dayOfTrip,
    totalDays,
    todayThemeName: itinerary[0]?.themeName ?? null,
    expenseRunningTotalCents,
    recentLoreCount,
    ctaUrl: `${appUrl}/${event.ritual.slug}/${event.year}`,
  }
}

/* ============================================================
 * Stage 5 — Closeout (concluded)
 * ============================================================ */
export interface Stage5CloseoutContent {
  variant: 'stage5_closeout'
  event: EventSnapshot
  awardsPodium: { awardName: string; winner: string | null }[]
  recipientBalanceCents: number | null
  ctaUrl: string
}

export async function buildStage5Closeout(
  eventId: string,
  recipientUserId: string | null,
  appUrl: string
): Promise<Stage5CloseoutContent | null> {
  const event = await loadEventSnapshot(eventId)
  if (!event) return null

  const podiumRows = await db
    .select({
      awardName: ritualAwardDefinitions.name,
      winnerName: users.name,
    })
    .from(awards)
    .innerJoin(
      ritualAwardDefinitions,
      eq(awards.awardDefinitionId, ritualAwardDefinitions.id)
    )
    .leftJoin(users, eq(awards.winnerId, users.id))
    .where(eq(awards.eventId, eventId))

  // Balance: very cheap heuristic — sum what user paid minus equal share.
  // Real settlement math lives in lib/expense-utils; using simple version here.
  let recipientBalanceCents: number | null = null
  if (recipientUserId) {
    const allExpenses = await db
      .select({ paidById: expenses.paidBy, amount: expenses.amount })
      .from(expenses)
      .where(eq(expenses.eventId, eventId))
    const attendees = await db
      .select({ userId: eventAttendees.userId })
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId))
    const total = allExpenses.reduce((s, e) => s + (e.amount ?? 0), 0)
    const share = attendees.length > 0 ? Math.round(total / attendees.length) : 0
    const paid = allExpenses
      .filter((e) => e.paidById === recipientUserId)
      .reduce((s, e) => s + (e.amount ?? 0), 0)
    recipientBalanceCents = paid - share
  }

  return {
    variant: 'stage5_closeout',
    event,
    awardsPodium: podiumRows.map((p) => ({
      awardName: p.awardName,
      winner: p.winnerName,
    })),
    recipientBalanceCents,
    ctaUrl: `${appUrl}/${event.ritual.slug}/${event.year}`,
  }
}

/* ============================================================
 * Stage 6 — Mythology (closed/archived, ~30d after seal)
 * ============================================================ */
export interface Stage6MythologyContent {
  variant: 'stage6_mythology'
  ritual: RitualSnapshot
  recapEvent: {
    name: string
    year: number
    location: string | null
    coverPhotoUrl: string | null
    mvpName: string | null
  }
  ctaUrl: string
}

export async function buildStage6Mythology(
  eventId: string,
  appUrl: string
): Promise<Stage6MythologyContent | null> {
  const event = await loadEventSnapshot(eventId)
  if (!event) return null
  const ev = await db.query.events.findFirst({ where: eq(events.id, eventId) })
  if (!ev) return null

  const mvpRow = await db
    .select({ name: users.name })
    .from(awards)
    .innerJoin(
      ritualAwardDefinitions,
      eq(awards.awardDefinitionId, ritualAwardDefinitions.id)
    )
    .leftJoin(users, eq(awards.winnerId, users.id))
    .where(and(eq(awards.eventId, eventId), eq(ritualAwardDefinitions.type, 'mvp')))
    .limit(1)

  return {
    variant: 'stage6_mythology',
    ritual: event.ritual,
    recapEvent: {
      name: event.name,
      year: event.year,
      location: event.location,
      coverPhotoUrl: ev.coverPhotoUrl,
      mvpName: mvpRow[0]?.name ?? null,
    },
    ctaUrl: `${appUrl}/${event.ritual.slug}/new-event?mode=call`,
  }
}

/* ============================================================
 * Discriminated union for downstream consumers
 * ============================================================ */
export type CallContent =
  | Stage1ColdStartContent
  | Stage1OngoingContent
  | Stage2VoteContent
  | Stage3ConfirmedContent
  | Stage3aCommitContent
  | Stage3bPackListContent
  | Stage4InTripContent
  | Stage5CloseoutContent
  | Stage6MythologyContent
