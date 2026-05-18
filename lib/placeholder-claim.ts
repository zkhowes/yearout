import { db } from '@/db'
import { eq } from 'drizzle-orm'
import { ritualMembers, users } from '@/db/schema'
import { eventAttendees } from '@/db/schema/crew'
import {
  expenseSplits,
  awards,
  awardVotes,
  loreEntries,
  loreMentions,
  activityResults,
  proposalVotes,
  callVotes,
  settlementPayments,
  expenses,
  eventProposals,
  events,
} from '@/db/schema/events'

/**
 * Reassign all references from a stub user to a real user. Caller is
 * responsible for authorization. Used by:
 *  - claimPlaceholder server action (manual picker after OAuth)
 *  - auth.ts signIn callback (email-match auto-claim path; the stub row IS
 *    the row Auth.js will load as the session user, so realUserId === stubUserId
 *    and only the placeholder flag flip is needed)
 *
 * Returns the list of ritualIds whose placeholders were converted, so the
 * caller can fire sponsor notice emails.
 */
export async function convertStubReferences(
  stubUserId: string,
  realUserId: string,
): Promise<{ convertedRitualIds: string[] }> {
  if (stubUserId === realUserId) {
    // Same row — just flip placeholder flags. Happens when DrizzleAdapter
    // linked OAuth to an existing stub: the users row stays put.
    const flippedRows = await db
      .update(ritualMembers)
      .set({ isPlaceholder: false, placeholderCreatedBy: null })
      .where(eq(ritualMembers.userId, stubUserId))
      .returning({ ritualId: ritualMembers.ritualId })
    return { convertedRitualIds: flippedRows.map((r) => r.ritualId) }
  }

  // Different users — collapse any conflicting real-user memberships and
  // remap every FK that pointed at the stub.
  const stubMemberships = await db.query.ritualMembers.findMany({
    where: (rm, { eq: e }) => e(rm.userId, stubUserId),
  })
  for (const sm of stubMemberships) {
    const conflict = await db.query.ritualMembers.findFirst({
      where: (rm, { and: a, eq: e }) =>
        a(e(rm.ritualId, sm.ritualId), e(rm.userId, realUserId)),
    })
    if (conflict) {
      await db.delete(ritualMembers).where(eq(ritualMembers.id, conflict.id))
    }
  }

  await db
    .update(ritualMembers)
    .set({ userId: realUserId, isPlaceholder: false, placeholderCreatedBy: null })
    .where(eq(ritualMembers.userId, stubUserId))
  await db.update(eventAttendees).set({ userId: realUserId }).where(eq(eventAttendees.userId, stubUserId))
  await db.update(expenseSplits).set({ userId: realUserId }).where(eq(expenseSplits.userId, stubUserId))
  await db.update(expenses).set({ paidBy: realUserId }).where(eq(expenses.paidBy, stubUserId))
  await db.update(awards).set({ winnerId: realUserId }).where(eq(awards.winnerId, stubUserId))
  await db.update(awardVotes).set({ voterId: realUserId }).where(eq(awardVotes.voterId, stubUserId))
  await db.update(awardVotes).set({ nomineeId: realUserId }).where(eq(awardVotes.nomineeId, stubUserId))
  await db.update(loreEntries).set({ authorId: realUserId }).where(eq(loreEntries.authorId, stubUserId))
  await db.update(loreMentions).set({ userId: realUserId }).where(eq(loreMentions.userId, stubUserId))
  await db.update(activityResults).set({ userId: realUserId }).where(eq(activityResults.userId, stubUserId))
  await db.update(proposalVotes).set({ userId: realUserId }).where(eq(proposalVotes.userId, stubUserId))
  await db.update(callVotes).set({ userId: realUserId }).where(eq(callVotes.userId, stubUserId))
  await db.update(eventProposals).set({ proposedBy: realUserId }).where(eq(eventProposals.proposedBy, stubUserId))
  await db.update(events).set({ organizerId: realUserId }).where(eq(events.organizerId, stubUserId))
  await db.update(settlementPayments).set({ fromUserId: realUserId }).where(eq(settlementPayments.fromUserId, stubUserId))
  await db.update(settlementPayments).set({ toUserId: realUserId }).where(eq(settlementPayments.toUserId, stubUserId))

  const linked = await db.query.accounts.findFirst({
    where: (a, { eq: e }) => e(a.userId, stubUserId),
  })
  if (!linked) {
    await db.delete(users).where(eq(users.id, stubUserId))
  }

  return { convertedRitualIds: stubMemberships.map((m) => m.ritualId) }
}
