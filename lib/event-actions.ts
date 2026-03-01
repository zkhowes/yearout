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
  awardVotes,
  awards,
  ritualAwardDefinitions,
  dailyItinerary,
} from '@/db/schema'
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
    organizerId: session.user.id!,
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
    location: data.location?.trim() || null,
    dates: data.dates?.trim() || null,
    notes: data.notes?.trim() || null,
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
    organizerId: string
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
    organizerId: data.organizerId,
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

  if (members.length > 0) {
    await db
      .insert(eventAttendees)
      .values(
        members.map((m) => ({
          id: crypto.randomUUID(),
          eventId,
          userId: m.userId,
          bookingStatus: 'not_yet' as const,
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

// ─── Event Status ─────────────────────────────────────────────────────────────

export async function advanceEventStatus(
  eventId: string,
  newStatus: 'in_progress' | 'closed',
  ritualSlug: string,
  year: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await requireSponsorOrOrganizer(eventId, session.user.id!)

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
  amountCents: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await db.insert(expenses).values({
    id: crypto.randomUUID(),
    eventId,
    paidBy: session.user.id!,
    description: description.trim(),
    amount: amountCents,
    createdAt: new Date(),
  })

  revalidatePath(`/${ritualSlug}/${year}`)
}

export async function deleteExpense(
  expenseId: string,
  ritualSlug: string,
  year: number
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await db
    .delete(expenses)
    .where(
      and(eq(expenses.id, expenseId), eq(expenses.paidBy, session.user.id!))
    )

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Lore ─────────────────────────────────────────────────────────────────────

export async function addLoreEntry(
  eventId: string,
  ritualSlug: string,
  year: number,
  type: 'memory' | 'checkin',
  content: string,
  location?: string,
  day?: Date
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await db.insert(loreEntries).values({
    id: crypto.randomUUID(),
    eventId,
    authorId: session.user.id!,
    type,
    content: content.trim(),
    location: location?.trim() || null,
    day: day || null,
    isHallOfFame: false,
    createdAt: new Date(),
  })

  revalidatePath(`/${ritualSlug}/${year}`)
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
  const isOrganizer = event.organizerId === session.user.id

  if (!isAuthor && !isSponsor && !isOrganizer) throw new Error('Not authorized')

  await db
    .update(loreEntries)
    .set({ isHallOfFame: !entry.isHallOfFame })
    .where(eq(loreEntries.id, entryId))

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
  }

  revalidatePath(`/${ritualSlug}/${year}`)
}

// ─── Daily Itinerary ─────────────────────────────────────────────────────────

async function requireSponsorOrOrganizer(eventId: string, userId: string) {
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
  const isOrganizer = event.organizerId === userId
  if (!isSponsor && !isOrganizer) throw new Error('Only sponsors or organizers can manage itinerary')

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

  await requireSponsorOrOrganizer(eventId, session.user.id!)

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

  await requireSponsorOrOrganizer(entry.eventId, session.user.id!)

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

  await requireSponsorOrOrganizer(entry.eventId, session.user.id!)

  await db.delete(dailyItinerary).where(eq(dailyItinerary.id, itineraryId))

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
