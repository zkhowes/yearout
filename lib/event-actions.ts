'use server'

import { db } from '@/db'
import {
  events,
  eventProposals,
  proposalVotes,
  eventAttendees,
  ritualMembers,
  loreEntries,
  activityResults,
  expenses,
  expenseSplits,
  settlementPayments,
  awardVotes,
  awards,
  ritualAwardDefinitions,
  dailyItinerary,
  loreMentions,
  eventBookings,
  callDateOptions,
  callLocationOptions,
  callVotes,
  callSends,
} from '@/db/schema'
import { computeEqualSplit, validateExactSplit } from '@/lib/expense-utils'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'

export async function createEvent(
  ritualId: string,
  ritualSlug: string,
  data: {
    name: string
    year: number
    location?: string       // becomes the initial proposal location
    proposedDates?: string  // e.g. "Jan 15–20"
  }
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(
        eq(rm.ritualId, ritualId),
        eq(rm.userId, session.user!.id!),
        eq(rm.role, 'sponsor')
      ),
  })
  if (!member) throw new Error('Only the sponsor can create events')

  const eventId = crypto.randomUUID()

  await db.insert(events).values({
    id: eventId,
    ritualId,
    organizerId: null,
    name: data.name.trim(),
    year: data.year,
    location: null,   // set when a proposal is locked
    status: 'planning',
    createdAt: new Date(),
  })

  // Create an initial proposal if location or dates were provided
  if (data.location?.trim() || data.proposedDates?.trim()) {
    await db.insert(eventProposals).values({
      id: crypto.randomUUID(),
      eventId,
      proposedBy: session.user.id!,
      location: data.location?.trim() || null,
      dates: data.proposedDates?.trim() || null,
      createdAt: new Date(),
    })
  }

  redirect(`/${ritualSlug}/${data.year}`)
}

export async function addProposal(
  eventId: string,
  data: { location?: string; dates?: string; notes?: string }
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await db.insert(eventProposals).values({
    id: crypto.randomUUID(),
    eventId,
    proposedBy: session.user.id!,
    location: data.location?.trim().slice(0, 500) || null,
    dates: data.dates?.trim().slice(0, 200) || null,
    notes: data.notes?.trim().slice(0, 1000) || null,
    createdAt: new Date(),
  })
}

export async function castVote(
  proposalId: string,
  vote: 'yes' | 'no' | 'maybe'
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Upsert: replace existing vote if any
  const existing = await db.query.proposalVotes.findFirst({
    where: (pv, { and, eq }) =>
      and(eq(pv.proposalId, proposalId), eq(pv.userId, session.user!.id!)),
  })

  if (existing) {
    await db
      .update(proposalVotes)
      .set({ vote })
      .where(eq(proposalVotes.id, existing.id))
  } else {
    await db.insert(proposalVotes).values({
      id: crypto.randomUUID(),
      proposalId,
      userId: session.user.id!,
      vote,
      createdAt: new Date(),
    })
  }
}

export async function lockProposal(proposalId: string, ritualSlug: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const proposal = await db.query.eventProposals.findFirst({
    where: (ep, { eq }) => eq(ep.id, proposalId),
  })
  if (!proposal) throw new Error('Proposal not found')

  // Verify sponsor of this event's ritual
  const event = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, proposal.eventId),
  })
  if (!event) throw new Error('Event not found')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(
        eq(rm.ritualId, event.ritualId),
        eq(rm.userId, session.user!.id!),
        eq(rm.role, 'sponsor')
      ),
  })
  if (!member) throw new Error('Only sponsors can lock proposals')

  // Promote proposal → event
  await db
    .update(events)
    .set({
      status: 'scheduled',
      location: proposal.location,
    })
    .where(eq(events.id, event.id))

  // Seed all ritual members as attendees
  const members = await db
    .select()
    .from(ritualMembers)
    .where(eq(ritualMembers.ritualId, event.ritualId))

  if (members.length > 0) {
    await db
      .insert(eventAttendees)
      .values(
        members.map((m) => ({
          id: crypto.randomUUID(),
          eventId: event.id,
          userId: m.userId,
          bookingStatus: 'not_yet' as const,
          isHost: m.userId === session.user!.id!,
        }))
      )
      .onConflictDoNothing()
  }

  redirect(`/${ritualSlug}/${event.year}`)
}

export async function deleteProposal(proposalId: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await db
    .delete(eventProposals)
    .where(
      and(
        eq(eventProposals.id, proposalId),
        eq(eventProposals.proposedBy, session.user.id!)
      )
    )
}

// ─── Quick Enter ──────────────────────────────────────────────────────────────

export async function quickEnterEvent(
  ritualId: string,
  ritualSlug: string,
  data: {
    name: string
    year: number
    location: string
    mountains?: string
    startDate?: Date
    endDate?: Date
    hostIds: string[]
    status: 'scheduled' | 'in_progress' | 'closed'
    mvpWinnerId?: string
    lupWinnerId?: string
  }
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(
        eq(rm.ritualId, ritualId),
        eq(rm.userId, session.user!.id!),
        eq(rm.role, 'sponsor')
      ),
  })
  if (!member) throw new Error('Only the sponsor can create events')

  const eventId = crypto.randomUUID()
  const now = new Date()

  await db.insert(events).values({
    id: eventId,
    ritualId,
    organizerId: null,
    name: data.name.trim(),
    year: data.year,
    location: data.location.trim(),
    mountains: data.mountains?.trim() || null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    status: data.status,
    sealedAt: data.status === 'closed' ? now : null,
    createdAt: now,
  })

  // Seed all ritual members as attendees
  const members = await db
    .select()
    .from(ritualMembers)
    .where(eq(ritualMembers.ritualId, ritualId))

  const hostIdSet = new Set(data.hostIds)
  if (members.length > 0) {
    await db
      .insert(eventAttendees)
      .values(
        members.map((m) => ({
          id: crypto.randomUUID(),
          eventId,
          userId: m.userId,
          bookingStatus: 'not_yet' as const,
          isHost: hostIdSet.has(m.userId),
        }))
      )
      .onConflictDoNothing()
  }

  // If closed, insert awards for mvp/lup
  if (data.status === 'closed' && (data.mvpWinnerId || data.lupWinnerId)) {
    const awardDefs = await db
      .select()
      .from(ritualAwardDefinitions)
      .where(eq(ritualAwardDefinitions.ritualId, ritualId))

    const awardInserts: {
      id: string
      eventId: string
      awardDefinitionId: string
      winnerId: string
      createdAt: Date
    }[] = []

    if (data.mvpWinnerId) {
      const mvpDef = awardDefs.find((d) => d.type === 'mvp')
      if (mvpDef) {
        awardInserts.push({
          id: crypto.randomUUID(),
          eventId,
          awardDefinitionId: mvpDef.id,
          winnerId: data.mvpWinnerId,
          createdAt: now,
        })
      }
    }

    if (data.lupWinnerId) {
      const lupDef = awardDefs.find((d) => d.type === 'lup')
      if (lupDef) {
        awardInserts.push({
          id: crypto.randomUUID(),
          eventId,
          awardDefinitionId: lupDef.id,
          winnerId: data.lupWinnerId,
          createdAt: now,
        })
      }
    }

    if (awardInserts.length > 0) {
      await db.insert(awards).values(awardInserts)
    }
  }

  redirect(`/${ritualSlug}/${data.year}`)
}

// ─── Booking Status ───────────────────────────────────────────────────────────

export async function updateBookingStatus(
  eventId: string,
  ritualSlug: string,
  year: number,
  status: 'not_yet' | 'committed' | 'flights_booked' | 'all_booked' | 'out'
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const existing = await db.query.eventAttendees.findFirst({
    where: (ea, { and, eq }) =>
      and(eq(ea.eventId, eventId), eq(ea.userId, session.user!.id!)),
  })

  if (existing) {
    await db
      .update(eventAttendees)
      .set({ bookingStatus: status })
      .where(eq(eventAttendees.id, existing.id))
  } else {
    await db.insert(eventAttendees).values({
      id: crypto.randomUUID(),
      eventId,
      userId: session.user.id!,
      bookingStatus: status,
    })
  }

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function updateBookingStatusForUser(
  eventId: string,
  ritualSlug: string,
  year: number,
  targetUserId: string,
  status: 'not_yet' | 'committed' | 'flights_booked' | 'all_booked' | 'out'
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await requireSponsorOrHost(eventId, session.user.id!)

  const existing = await db.query.eventAttendees.findFirst({
    where: (ea, { and, eq }) =>
      and(eq(ea.eventId, eventId), eq(ea.userId, targetUserId)),
  })

  if (existing) {
    await db
      .update(eventAttendees)
      .set({ bookingStatus: status })
      .where(eq(eventAttendees.id, existing.id))
  }

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function updateFlightDetailsForUser(
  eventId: string,
  ritualSlug: string,
  year: number,
  targetUserId: string,
  flightData: {
    arrivalAirline?: string
    arrivalFlightNumber?: string
    arrivalDatetime?: Date | null
    departureAirline?: string
    departureFlightNumber?: string
    departureDatetime?: Date | null
  }
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await requireSponsorOrHost(eventId, session.user.id!)

  const existing = await db.query.eventAttendees.findFirst({
    where: (ea, { and, eq }) =>
      and(eq(ea.eventId, eventId), eq(ea.userId, targetUserId)),
  })

  if (!existing) throw new Error('Not an attendee of this event')

  await db
    .update(eventAttendees)
    .set({
      arrivalAirline: flightData.arrivalAirline?.trim() || null,
      arrivalFlightNumber: flightData.arrivalFlightNumber?.trim() || null,
      arrivalDatetime: flightData.arrivalDatetime || null,
      departureAirline: flightData.departureAirline?.trim() || null,
      departureFlightNumber: flightData.departureFlightNumber?.trim() || null,
      departureDatetime: flightData.departureDatetime || null,
    })
    .where(eq(eventAttendees.id, existing.id))

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Event Status ─────────────────────────────────────────────────────────────

export async function advanceEventStatus(
  eventId: string,
  newStatus: 'in_progress' | 'closed',
  ritualSlug: string,
  year: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await requireSponsorOrHost(eventId, session.user.id!)

  await db
    .update(events)
    .set({ status: newStatus })
    .where(eq(events.id, eventId))

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function addExpense(
  eventId: string,
  ritualSlug: string,
  year: number,
  description: string,
  amountCents: number,
  options?: {
    splitType?: 'equal' | 'exact'
    splitUserIds?: string[]
    exactAmounts?: { userId: string; amount: number }[]
    category?: string
  }
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const splitType = options?.splitType ?? 'equal'
  const category = options?.category ?? null

  // Determine participants: provided list, or all non-"out" attendees
  let splitUserIds = options?.splitUserIds
  if (!splitUserIds || splitUserIds.length === 0) {
    const attendees = await db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId))
    splitUserIds = attendees
      .filter((a) => a.bookingStatus !== 'out')
      .map((a) => a.userId)
  }

  // Compute splits
  let splits: { userId: string; amount: number }[]
  if (splitType === 'exact' && options?.exactAmounts) {
    const err = validateExactSplit(amountCents, options.exactAmounts)
    if (err) throw new Error(err)
    splits = options.exactAmounts
  } else {
    const splitMap = computeEqualSplit(amountCents, splitUserIds)
    splits = Array.from(splitMap.entries()).map(([userId, amount]) => ({ userId, amount }))
  }

  const expenseId = crypto.randomUUID()

  await db.insert(expenses).values({
    id: expenseId,
    eventId,
    paidBy: session.user.id!,
    description: description.trim().slice(0, 500),
    amount: amountCents,
    splitType,
    category,
    createdAt: new Date(),
  })

  if (splits.length > 0) {
    await db.insert(expenseSplits).values(
      splits.map((s) => ({
        id: crypto.randomUUID(),
        expenseId,
        userId: s.userId,
        amount: s.amount,
      }))
    )
  }

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function updateExpense(
  expenseId: string,
  ritualSlug: string,
  year: number,
  description: string,
  amountCents: number,
  options?: {
    splitType?: 'equal' | 'exact'
    splitUserIds?: string[]
    exactAmounts?: { userId: string; amount: number }[]
    category?: string
  }
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Only expense creator can edit
  const expense = await db.query.expenses.findFirst({
    where: (e, { eq: eqFn }) => eqFn(e.id, expenseId),
  })
  if (!expense) throw new Error('Expense not found')
  if (expense.paidBy !== session.user.id) throw new Error('Only the creator can edit this expense')

  const splitType = options?.splitType ?? 'equal'
  const category = options?.category ?? null

  let splitUserIds = options?.splitUserIds
  if (!splitUserIds || splitUserIds.length === 0) {
    const attendees = await db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, expense.eventId))
    splitUserIds = attendees
      .filter((a) => a.bookingStatus !== 'out')
      .map((a) => a.userId)
  }

  let splits: { userId: string; amount: number }[]
  if (splitType === 'exact' && options?.exactAmounts) {
    const err = validateExactSplit(amountCents, options.exactAmounts)
    if (err) throw new Error(err)
    splits = options.exactAmounts
  } else {
    const splitMap = computeEqualSplit(amountCents, splitUserIds)
    splits = Array.from(splitMap.entries()).map(([userId, amount]) => ({ userId, amount }))
  }

  await db
    .update(expenses)
    .set({
      description: description.trim(),
      amount: amountCents,
      splitType,
      category,
    })
    .where(eq(expenses.id, expenseId))

  // Delete old splits, insert new
  await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId))

  if (splits.length > 0) {
    await db.insert(expenseSplits).values(
      splits.map((s) => ({
        id: crypto.randomUUID(),
        expenseId,
        userId: s.userId,
        amount: s.amount,
      }))
    )
  }

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function deleteExpense(
  expenseId: string,
  ritualSlug: string,
  year: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Splits cascade-delete via FK
  await db
    .delete(expenses)
    .where(
      and(eq(expenses.id, expenseId), eq(expenses.paidBy, session.user.id!))
    )

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Settlement Payments ──────────────────────────────────────────────────────

export async function markSettlementPaid(
  eventId: string,
  ritualSlug: string,
  year: number,
  toUserId: string,
  amountCents: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Check for existing non-reset payment to prevent duplicates
  const existing = await db.query.settlementPayments.findFirst({
    where: (sp, { and: andFn, eq: eqFn }) =>
      andFn(
        eqFn(sp.eventId, eventId),
        eqFn(sp.fromUserId, session.user!.id!),
        eqFn(sp.toUserId, toUserId),
      ),
  })

  if (existing && existing.status !== 'pending') {
    throw new Error('Payment already marked')
  }

  if (existing) {
    // Update existing pending payment
    await db
      .update(settlementPayments)
      .set({ status: 'paid', paidAt: new Date() })
      .where(eq(settlementPayments.id, existing.id))
  } else {
    await db.insert(settlementPayments).values({
      id: crypto.randomUUID(),
      eventId,
      fromUserId: session.user.id!,
      toUserId,
      amount: amountCents,
      status: 'paid',
      paidAt: new Date(),
      createdAt: new Date(),
    })
  }

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function confirmSettlementPayment(
  paymentId: string,
  ritualSlug: string,
  year: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const payment = await db.query.settlementPayments.findFirst({
    where: (sp, { eq: eqFn }) => eqFn(sp.id, paymentId),
  })
  if (!payment) throw new Error('Payment not found')

  // Require sponsor/host or the creditor (toUserId)
  const isCreditor = payment.toUserId === session.user.id
  if (!isCreditor) {
    await requireSponsorOrHost(payment.eventId, session.user.id!)
  }

  await db
    .update(settlementPayments)
    .set({
      status: 'confirmed',
      confirmedAt: new Date(),
      confirmedBy: session.user.id!,
    })
    .where(eq(settlementPayments.id, paymentId))

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function resetSettlementPayment(
  paymentId: string,
  ritualSlug: string,
  year: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const payment = await db.query.settlementPayments.findFirst({
    where: (sp, { eq: eqFn }) => eqFn(sp.id, paymentId),
  })
  if (!payment) throw new Error('Payment not found')

  await requireSponsorOrHost(payment.eventId, session.user.id!)

  await db
    .update(settlementPayments)
    .set({
      status: 'pending',
      paidAt: null,
      confirmedAt: null,
      confirmedBy: null,
    })
    .where(eq(settlementPayments.id, paymentId))

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Lore ─────────────────────────────────────────────────────────────────────

export async function addLoreEntry(
  eventId: string,
  ritualSlug: string,
  year: number,
  type: 'memory' | 'checkin' | 'image',
  content: string,
  location?: string,
  day?: Date,
  mediaUrl?: string,
  mentionedUserIds?: string[]
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const trimmed = content.trim().slice(0, 5000)

  const entryId = crypto.randomUUID()
  await db.insert(loreEntries).values({
    id: entryId,
    eventId,
    authorId: session.user.id!,
    type,
    content: trimmed,
    mediaUrl: mediaUrl || null,
    location: location?.trim().slice(0, 200) || null,
    day: day || null,
    isHallOfFame: false,
    createdAt: new Date(),
  })

  if (mentionedUserIds && mentionedUserIds.length > 0) {
    await db.insert(loreMentions).values(
      mentionedUserIds.map((uid) => ({
        id: crypto.randomUUID(),
        loreEntryId: entryId,
        userId: uid,
      }))
    )
  }

  revalidatePath(`/${ritualSlug}/${year}`)
  revalidatePath(`/${ritualSlug}/lore`)
}

export async function toggleLoreHOF(
  entryId: string,
  ritualSlug: string,
  year: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const entry = await db.query.loreEntries.findFirst({
    where: (le, { eq }) => eq(le.id, entryId),
  })
  if (!entry) throw new Error('Lore entry not found')

  // Only author, sponsor, or organizer can toggle HOF
  const event = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, entry.eventId),
  })
  if (!event) throw new Error('Event not found')

  const isAuthor = entry.authorId === session.user.id
  const isSponsor = !!(await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(
        eq(rm.ritualId, event.ritualId),
        eq(rm.userId, session.user!.id!),
        eq(rm.role, 'sponsor')
      ),
  }))
  const isHost = !!(await db.query.eventAttendees.findFirst({
    where: (ea, { and, eq }) =>
      and(eq(ea.eventId, event.id), eq(ea.userId, session.user!.id!), eq(ea.isHost, true)),
  }))

  if (!isAuthor && !isSponsor && !isHost) throw new Error('Not authorized')

  await db
    .update(loreEntries)
    .set({ isHallOfFame: !entry.isHallOfFame })
    .where(eq(loreEntries.id, entryId))

  revalidatePath(`/${ritualSlug}/${year}`)
  revalidatePath(`/${ritualSlug}/lore`)
}

export async function deleteLoreEntry(
  entryId: string,
  ritualSlug: string,
  year: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const entry = await db.query.loreEntries.findFirst({
    where: (le, { eq }) => eq(le.id, entryId),
  })
  if (!entry) throw new Error('Lore entry not found')

  const event = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, entry.eventId),
  })
  if (!event) throw new Error('Event not found')

  const isAuthor = entry.authorId === session.user.id
  if (!isAuthor) {
    await requireSponsorOrHost(event.id, session.user.id!)
  }

  await db.delete(loreEntries).where(eq(loreEntries.id, entryId))

  revalidatePath(`/${ritualSlug}/${year}`)
  revalidatePath(`/${ritualSlug}/lore`)
}

export async function moveLoreEntry(
  entryId: string,
  targetEventId: string,
  ritualSlug: string,
  sourceYear: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const entry = await db.query.loreEntries.findFirst({
    where: (le, { eq }) => eq(le.id, entryId),
  })
  if (!entry) throw new Error('Lore entry not found')

  const sourceEvent = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, entry.eventId),
  })
  if (!sourceEvent) throw new Error('Source event not found')

  const targetEvent = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, targetEventId),
  })
  if (!targetEvent) throw new Error('Target event not found')

  // Must be same ritual
  if (sourceEvent.ritualId !== targetEvent.ritualId) throw new Error('Events must be in the same ritual')

  // Only sponsor or host can move
  await requireSponsorOrHost(sourceEvent.id, session.user.id!)

  await db
    .update(loreEntries)
    .set({ eventId: targetEventId })
    .where(eq(loreEntries.id, entryId))

  revalidatePath(`/${ritualSlug}/${sourceYear}`)
  revalidatePath(`/${ritualSlug}/${targetEvent.year}`)
  revalidatePath(`/${ritualSlug}/lore`)
}

export async function updateEventEdit(
  eventId: string,
  ritualSlug: string,
  year: number,
  editUrl: string,
  editThumbnailUrl?: string
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await requireSponsorOrHost(eventId, session.user.id!)

  await db
    .update(events)
    .set({
      editUrl: editUrl.trim() || null,
      editThumbnailUrl: editThumbnailUrl?.trim() || null,
    })
    .where(eq(events.id, eventId))

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Activity Results ─────────────────────────────────────────────────────────

export async function addActivityResult(
  eventId: string,
  ritualSlug: string,
  year: number,
  userId: string,
  metric: string,
  value: string,
  unit?: string,
  day?: Date
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Self or sponsor can add results for others
  if (userId !== session.user.id) {
    const event = await db.query.events.findFirst({
      where: (e, { eq }) => eq(e.id, eventId),
    })
    if (!event) throw new Error('Event not found')

    const isSponsor = !!(await db.query.ritualMembers.findFirst({
      where: (rm, { and, eq }) =>
        and(
          eq(rm.ritualId, event.ritualId),
          eq(rm.userId, session.user!.id!),
          eq(rm.role, 'sponsor')
        ),
    }))
    if (!isSponsor) throw new Error('Only sponsors can add results for others')
  }

  await db.insert(activityResults).values({
    id: crypto.randomUUID(),
    eventId,
    userId,
    metric: metric.trim(),
    value: value.trim(),
    unit: unit?.trim() || null,
    day: day || null,
    createdAt: new Date(),
  })

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Awards ───────────────────────────────────────────────────────────────────

export async function setAwardWinner(
  eventId: string,
  ritualSlug: string,
  year: number,
  awardDefId: string,
  winnerId: string
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const event = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, eventId),
  })
  if (!event) throw new Error('Event not found')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(
        eq(rm.ritualId, event.ritualId),
        eq(rm.userId, session.user!.id!),
        eq(rm.role, 'sponsor')
      ),
  })
  if (!member) throw new Error('Only sponsors can assign award winners')

  const existing = await db.query.awards.findFirst({
    where: (a, { and, eq }) =>
      and(eq(a.eventId, eventId), eq(a.awardDefinitionId, awardDefId)),
  })

  if (existing) {
    await db
      .update(awards)
      .set({ winnerId })
      .where(eq(awards.id, existing.id))
  } else {
    await db.insert(awards).values({
      id: crypto.randomUUID(),
      eventId,
      awardDefinitionId: awardDefId,
      winnerId,
      createdAt: new Date(),
    })
  }

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function castAwardVote(
  eventId: string,
  ritualSlug: string,
  year: number,
  awardDefId: string,
  nomineeId: string
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const voterId = session.user.id!

  // 1. Self-vote guard
  if (nomineeId === voterId) throw new Error('Cannot vote for yourself')

  // 2. Duplicate nominee guard + 3. Vote cap
  const existingVotes = await db
    .select()
    .from(awardVotes)
    .where(
      and(
        eq(awardVotes.eventId, eventId),
        eq(awardVotes.awardDefinitionId, awardDefId),
        eq(awardVotes.voterId, voterId)
      )
    )

  if (existingVotes.some((v) => v.nomineeId === nomineeId)) {
    throw new Error('Already voted for this nominee')
  }

  if (existingVotes.length >= 2) {
    throw new Error('Maximum 2 votes per award')
  }

  // 4. Attendee check
  const attendee = await db.query.eventAttendees.findFirst({
    where: (ea, { and, eq }) =>
      and(eq(ea.eventId, eventId), eq(ea.userId, nomineeId)),
  })
  if (!attendee) throw new Error('Nominee is not an event attendee')

  await db.insert(awardVotes).values({
    id: crypto.randomUUID(),
    eventId,
    awardDefinitionId: awardDefId,
    voterId,
    nomineeId,
    createdAt: new Date(),
  })

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function retractAwardVote(
  voteId: string,
  ritualSlug: string,
  year: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await db
    .delete(awardVotes)
    .where(
      and(eq(awardVotes.id, voteId), eq(awardVotes.voterId, session.user.id!))
    )

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function finalizeAwardVotes(
  eventId: string,
  ritualSlug: string,
  year: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const event = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, eventId),
  })
  if (!event) throw new Error('Event not found')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(
        eq(rm.ritualId, event.ritualId),
        eq(rm.userId, session.user!.id!),
        eq(rm.role, 'sponsor')
      ),
  })
  if (!member) throw new Error('Only sponsors can finalize award votes')

  // Load all votes and award definitions for this event
  const [allVotes, awardDefs] = await Promise.all([
    db.select().from(awardVotes).where(eq(awardVotes.eventId, eventId)),
    db.select().from(ritualAwardDefinitions).where(eq(ritualAwardDefinitions.ritualId, event.ritualId)),
  ])

  for (const def of awardDefs) {
    const defVotes = allVotes.filter((v) => v.awardDefinitionId === def.id)
    if (defVotes.length === 0) continue

    // Tally votes per nominee, tracking earliest first vote for tie-breaking
    const tally = new Map<string, { count: number; firstVoteAt: Date }>()
    for (const v of defVotes) {
      const entry = tally.get(v.nomineeId)
      if (!entry) {
        tally.set(v.nomineeId, { count: 1, firstVoteAt: v.createdAt })
      } else {
        tally.set(v.nomineeId, {
          count: entry.count + 1,
          firstVoteAt: entry.firstVoteAt < v.createdAt ? entry.firstVoteAt : v.createdAt,
        })
      }
    }

    // Find winner: most votes; ties broken by earliest first-vote createdAt
    let winnerId: string | null = null
    let winnerCount = 0
    let winnerFirstVote: Date | null = null

    for (const [userId, { count, firstVoteAt }] of Array.from(tally.entries())) {
      if (
        !winnerId ||
        count > winnerCount ||
        (count === winnerCount && winnerFirstVote && firstVoteAt < winnerFirstVote)
      ) {
        winnerId = userId
        winnerCount = count
        winnerFirstVote = firstVoteAt
      }
    }

    if (!winnerId) continue

    const existing = await db.query.awards.findFirst({
      where: (a, { and, eq }) =>
        and(eq(a.eventId, eventId), eq(a.awardDefinitionId, def.id)),
    })

    if (existing) {
      await db.update(awards).set({ winnerId }).where(eq(awards.id, existing.id))
    } else {
      await db.insert(awards).values({
        id: crypto.randomUUID(),
        eventId,
        awardDefinitionId: def.id,
        winnerId,
        createdAt: new Date(),
      })
    }

    // Auto-assign runner_up from 2nd-place MVP votes
    if (def.type === 'mvp' && winnerId) {
      const runnerUpDef = awardDefs.find((d) => d.type === 'runner_up')
      if (runnerUpDef) {
        let runnerUpId: string | null = null
        let runnerUpCount = 0
        let runnerUpFirstVote: Date | null = null

        for (const [userId, { count, firstVoteAt }] of Array.from(tally.entries())) {
          if (userId === winnerId) continue
          if (
            !runnerUpId ||
            count > runnerUpCount ||
            (count === runnerUpCount && runnerUpFirstVote && firstVoteAt < runnerUpFirstVote)
          ) {
            runnerUpId = userId
            runnerUpCount = count
            runnerUpFirstVote = firstVoteAt
          }
        }

        if (runnerUpId) {
          const existingRU = await db.query.awards.findFirst({
            where: (a, { and, eq }) =>
              and(eq(a.eventId, eventId), eq(a.awardDefinitionId, runnerUpDef.id)),
          })
          if (existingRU) {
            await db.update(awards).set({ winnerId: runnerUpId }).where(eq(awards.id, existingRU.id))
          } else {
            await db.insert(awards).values({
              id: crypto.randomUUID(),
              eventId,
              awardDefinitionId: runnerUpDef.id,
              winnerId: runnerUpId,
              createdAt: new Date(),
            })
          }
        }
      }
    }
  }

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Daily Itinerary ─────────────────────────────────────────────────────────

async function requireSponsorOrHost(eventId: string, userId: string) {
  const event = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, eventId),
  })
  if (!event) throw new Error('Event not found')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(
        eq(rm.ritualId, event.ritualId),
        eq(rm.userId, userId),
      ),
  })
  if (!member) throw new Error('Not a member')

  const isSponsor = member.role === 'sponsor'

  if (!isSponsor) {
    const attendee = await db.query.eventAttendees.findFirst({
      where: (ea, { and, eq }) =>
        and(eq(ea.eventId, eventId), eq(ea.userId, userId), eq(ea.isHost, true)),
    })
    if (!attendee) throw new Error('Only sponsors or hosts can do this')
  }

  return event
}

export async function addItineraryDay(
  eventId: string,
  ritualSlug: string,
  year: number,
  day: Date,
  themeName?: string,
  notes?: string
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await requireSponsorOrHost(eventId, session.user.id!)

  await db.insert(dailyItinerary).values({
    id: crypto.randomUUID(),
    eventId,
    day,
    themeName: themeName?.trim() || null,
    notes: notes?.trim() || null,
  })

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function updateItineraryDay(
  itineraryId: string,
  ritualSlug: string,
  year: number,
  themeName?: string,
  notes?: string
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const entry = await db.query.dailyItinerary.findFirst({
    where: (di, { eq }) => eq(di.id, itineraryId),
  })
  if (!entry) throw new Error('Itinerary day not found')

  await requireSponsorOrHost(entry.eventId, session.user.id!)

  await db
    .update(dailyItinerary)
    .set({
      themeName: themeName?.trim() || null,
      notes: notes?.trim() || null,
    })
    .where(eq(dailyItinerary.id, itineraryId))

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function deleteItineraryDay(
  itineraryId: string,
  ritualSlug: string,
  year: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const entry = await db.query.dailyItinerary.findFirst({
    where: (di, { eq }) => eq(di.id, itineraryId),
  })
  if (!entry) throw new Error('Itinerary day not found')

  await requireSponsorOrHost(entry.eventId, session.user.id!)

  await db.delete(dailyItinerary).where(eq(dailyItinerary.id, itineraryId))

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Cover Photo ─────────────────────────────────────────────────────────────

export async function updateEventCoverPhoto(
  eventId: string,
  ritualSlug: string,
  year: number,
  coverPhotoUrl: string
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await requireSponsorOrHost(eventId, session.user.id!)

  await db
    .update(events)
    .set({ coverPhotoUrl })
    .where(eq(events.id, eventId))

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Attendee Management ────────────────────────────────────────────────────

export async function addEventAttendee(
  eventId: string,
  ritualSlug: string,
  year: number,
  userId: string
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await requireSponsorOrHost(eventId, session.user.id!)

  const existing = await db.query.eventAttendees.findFirst({
    where: (ea, { and, eq }) =>
      and(eq(ea.eventId, eventId), eq(ea.userId, userId)),
  })
  if (existing) return

  await db.insert(eventAttendees).values({
    id: crypto.randomUUID(),
    eventId,
    userId,
    bookingStatus: 'all_booked',
  })

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Event Details (location, mountains) ─────────────────────────

export async function updateEventDetails(
  eventId: string,
  ritualSlug: string,
  year: number,
  data: { name?: string; location?: string; mountains?: string; startDate?: Date | null; endDate?: Date | null }
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await requireSponsorOrHost(eventId, session.user.id!)

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.location !== undefined) updateData.location = data.location?.trim() || null
  if (data.mountains !== undefined) updateData.mountains = data.mountains?.trim() || null
  if (data.startDate !== undefined) updateData.startDate = data.startDate
  if (data.endDate !== undefined) updateData.endDate = data.endDate

  await db
    .update(events)
    .set(updateData)
    .where(eq(events.id, eventId))

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Event Logo ──────────────────────────────────────────────────────────────

export async function updateEventLogo(
  eventId: string,
  ritualSlug: string,
  year: number,
  logoUrl: string
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await requireSponsorOrHost(eventId, session.user.id!)

  await db
    .update(events)
    .set({ logoUrl })
    .where(eq(events.id, eventId))

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Flight Details ──────────────────────────────────────────────────────────

export async function updateFlightDetails(
  eventId: string,
  ritualSlug: string,
  year: number,
  flightData: {
    arrivalAirline?: string
    arrivalFlightNumber?: string
    arrivalDatetime?: Date | null
    departureAirline?: string
    departureFlightNumber?: string
    departureDatetime?: Date | null
  }
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const existing = await db.query.eventAttendees.findFirst({
    where: (ea, { and, eq }) =>
      and(eq(ea.eventId, eventId), eq(ea.userId, session.user!.id!)),
  })

  if (!existing) throw new Error('Not an attendee of this event')

  await db
    .update(eventAttendees)
    .set({
      arrivalAirline: flightData.arrivalAirline?.trim() || null,
      arrivalFlightNumber: flightData.arrivalFlightNumber?.trim() || null,
      arrivalDatetime: flightData.arrivalDatetime || null,
      departureAirline: flightData.departureAirline?.trim() || null,
      departureFlightNumber: flightData.departureFlightNumber?.trim() || null,
      departureDatetime: flightData.departureDatetime || null,
    })
    .where(eq(eventAttendees.id, existing.id))

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Seal Event ──────────────────────────────────────────────────────────────

export async function sealEvent(
  eventId: string,
  ritualSlug: string
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const event = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, eventId),
  })
  if (!event) throw new Error('Event not found')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(
        eq(rm.ritualId, event.ritualId),
        eq(rm.userId, session.user!.id!),
        eq(rm.role, 'sponsor')
      ),
  })
  if (!member) throw new Error('Only sponsors can seal events')

  await db
    .update(events)
    .set({ status: 'closed', sealedAt: new Date() })
    .where(eq(events.id, eventId))

  redirect(`/${ritualSlug}`)
}

// ─── Host Management ──────────────────────────────────────────────────────────

export async function toggleHostStatus(
  eventId: string,
  ritualSlug: string,
  year: number,
  targetUserId: string
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Only sponsors can toggle host status
  const event = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, eventId),
  })
  if (!event) throw new Error('Event not found')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(
        eq(rm.ritualId, event.ritualId),
        eq(rm.userId, session.user!.id!),
        eq(rm.role, 'sponsor')
      ),
  })
  if (!member) throw new Error('Only sponsors can manage hosts')

  const attendee = await db.query.eventAttendees.findFirst({
    where: (ea, { and, eq }) =>
      and(eq(ea.eventId, eventId), eq(ea.userId, targetUserId)),
  })
  if (!attendee) throw new Error('User is not an attendee')

  await db
    .update(eventAttendees)
    .set({ isHost: !attendee.isHost })
    .where(eq(eventAttendees.id, attendee.id))

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Event Bookings (Lodging & Transportation) ───────────────────────────────

export async function addEventBooking(
  eventId: string,
  ritualSlug: string,
  year: number,
  type: 'lodging' | 'transportation',
  name: string,
  link?: string,
  note?: string,
  startDate?: Date,
  endDate?: Date
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await requireSponsorOrHost(eventId, session.user.id!)

  await db.insert(eventBookings).values({
    id: crypto.randomUUID(),
    eventId,
    type,
    name: name.trim(),
    link: link?.trim() || null,
    note: note?.trim() || null,
    startDate: startDate || null,
    endDate: endDate || null,
    createdAt: new Date(),
  })

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function updateEventBooking(
  bookingId: string,
  ritualSlug: string,
  year: number,
  name?: string,
  link?: string,
  note?: string,
  startDate?: Date | null,
  endDate?: Date | null
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const booking = await db.query.eventBookings.findFirst({
    where: (eb, { eq: e }) => e(eb.id, bookingId),
  })
  if (!booking) throw new Error('Booking not found')

  await requireSponsorOrHost(booking.eventId, session.user.id!)

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name.trim()
  if (link !== undefined) updateData.link = link.trim() || null
  if (note !== undefined) updateData.note = note.trim() || null
  if (startDate !== undefined) updateData.startDate = startDate
  if (endDate !== undefined) updateData.endDate = endDate

  await db
    .update(eventBookings)
    .set(updateData)
    .where(eq(eventBookings.id, bookingId))

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function deleteEventBooking(
  bookingId: string,
  ritualSlug: string,
  year: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const booking = await db.query.eventBookings.findFirst({
    where: (eb, { eq: e }) => e(eb.id, bookingId),
  })
  if (!booking) throw new Error('Booking not found')

  await requireSponsorOrHost(booking.eventId, session.user.id!)

  await db.delete(eventBookings).where(eq(eventBookings.id, bookingId))

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── The Call ─────────────────────────────────────────────────────────────────

export async function createCall(
  ritualId: string,
  ritualSlug: string,
  data: {
    year: number
    callMode: 'best_fit' | 'all_or_none'
    dateRanges: { startDate: Date; endDate: Date }[]
    locations: string[]
  }
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(
        eq(rm.ritualId, ritualId),
        eq(rm.userId, session.user!.id!),
        eq(rm.role, 'sponsor')
      ),
  })
  if (!member) throw new Error('Only the sponsor can issue The Call')

  if (data.dateRanges.length < 1 || data.dateRanges.length > 3) {
    throw new Error('Provide 1-3 date ranges')
  }
  if (data.locations.length < 1 || data.locations.length > 3) {
    throw new Error('Provide 1-3 locations')
  }

  const eventId = crypto.randomUUID()

  // Placeholder name — will be replaced by AI when The Call is sent
  const placeholderName = `${ritualSlug} ${data.year}`

  await db.insert(events).values({
    id: eventId,
    ritualId,
    organizerId: null,
    name: placeholderName,
    year: data.year,
    location: null,
    status: 'planning',
    callMode: data.callMode,
    createdAt: new Date(),
  })

  // Insert date range options
  await db.insert(callDateOptions).values(
    data.dateRanges.map((r, i) => ({
      id: crypto.randomUUID(),
      eventId,
      startDate: r.startDate,
      endDate: r.endDate,
      sortOrder: i,
      createdAt: new Date(),
    }))
  )

  // Insert location options (AI cards generated async via API)
  const locationIds = data.locations.map((name, i) => ({
    id: crypto.randomUUID(),
    eventId,
    name: name.trim(),
    aiCard: null,
    sortOrder: i,
    createdAt: new Date(),
  }))
  await db.insert(callLocationOptions).values(locationIds)

  // Record Stage 2 (The Vote) call send
  await db.insert(callSends).values({
    id: crypto.randomUUID(),
    ritualId,
    eventId,
    stage: 2,
    sentAt: new Date(),
  })

  redirect(`/${ritualSlug}/${data.year}`)
}

export async function castCallVote(
  eventId: string,
  optionType: 'date' | 'location',
  optionId: string,
  ritualSlug: string,
  year: number,
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Toggle: delete if exists, insert if not
  const existing = await db.query.callVotes.findFirst({
    where: (cv, { and, eq }) =>
      and(
        eq(cv.userId, session.user!.id!),
        eq(cv.optionType, optionType),
        eq(cv.optionId, optionId),
      ),
  })

  if (existing) {
    await db.delete(callVotes).where(eq(callVotes.id, existing.id))
  } else {
    await db.insert(callVotes).values({
      id: crypto.randomUUID(),
      eventId,
      userId: session.user.id!,
      optionType,
      optionId,
      createdAt: new Date(),
    })
  }

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function sendTheCall(
  eventId: string,
  ritualSlug: string,
  winningDateOptionId: string,
  winningLocationOptionId: string,
  overrideName?: string,
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const event = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, eventId),
  })
  if (!event) throw new Error('Event not found')
  if (event.status !== 'planning') throw new Error('Event is not in planning state')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(
        eq(rm.ritualId, event.ritualId),
        eq(rm.userId, session.user!.id!),
        eq(rm.role, 'sponsor')
      ),
  })
  if (!member) throw new Error('Only sponsors can send The Call')

  // Fetch winning options
  const winningDate = await db.query.callDateOptions.findFirst({
    where: (d, { eq }) => eq(d.id, winningDateOptionId),
  })
  const winningLocation = await db.query.callLocationOptions.findFirst({
    where: (l, { eq }) => eq(l.id, winningLocationOptionId),
  })
  if (!winningDate || !winningLocation) throw new Error('Invalid winning options')

  // Determine event name
  let eventName = overrideName?.trim()
  if (!eventName) {
    // Try AI name generation, fall back to simple format
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3003'
      const res = await fetch(`${baseUrl}/api/call/generate-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: winningLocation.name,
          year: event.year,
          ritualName: ritualSlug,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        eventName = data.name
      }
    } catch {
      // fall through to default
    }
    if (!eventName) {
      eventName = `${winningLocation.name} ${event.year}`
    }
  }

  // Update event → scheduled
  await db
    .update(events)
    .set({
      status: 'scheduled',
      name: eventName,
      location: winningLocation.name,
      startDate: winningDate.startDate,
      endDate: winningDate.endDate,
    })
    .where(eq(events.id, eventId))

  // Seed all ritual members as attendees
  const members = await db
    .select()
    .from(ritualMembers)
    .where(eq(ritualMembers.ritualId, event.ritualId))

  if (members.length > 0) {
    await db
      .insert(eventAttendees)
      .values(
        members.map((m) => ({
          id: crypto.randomUUID(),
          eventId: event.id,
          userId: m.userId,
          bookingStatus: 'not_yet' as const,
          isHost: m.userId === session.user!.id!,
        }))
      )
      .onConflictDoNothing()
  }

  // Record Stage 3 call send
  await db.insert(callSends).values({
    id: crypto.randomUUID(),
    ritualId: event.ritualId,
    eventId,
    stage: 3,
    sentAt: new Date(),
  })

  redirect(`/${ritualSlug}/${event.year}`)
}
