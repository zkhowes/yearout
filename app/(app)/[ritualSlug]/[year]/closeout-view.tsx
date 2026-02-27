'use client'

import { useState, useTransition } from 'react'
import { ChevronRight, Loader2, Star, Check } from 'lucide-react'
import {
  castAwardVote,
  retractAwardVote,
  finalizeAwardVotes,
  sealEvent,
} from '@/lib/event-actions'

type Attendee = {
  id: string
  userId: string
  bookingStatus: string
}

type AttendeeUser = {
  id: string
  name: string | null
  image: string | null
}

type Expense = {
  id: string
  paidBy: string
  description: string
  amount: number
  createdAt: Date
}

type AwardDef = {
  id: string
  name: string
  label: string
  type: string
}

type Award = {
  id: string
  awardDefinitionId: string
  winnerId: string
}

type AwardVote = {
  id: string
  awardDefinitionId: string
  voterId: string
  nomineeId: string
}

// ─── Expense Settlement Math ──────────────────────────────────────────────────

type Settlement = {
  from: string
  to: string
  amountCents: number
}

function computeSettlement(expenses: Expense[], attendeeIds: string[]): Settlement[] {
  if (attendeeIds.length === 0) return []

  const totalCents = expenses.reduce((s, e) => s + e.amount, 0)
  const perPersonCents = Math.round(totalCents / attendeeIds.length)

  // net[userId] = total paid by user - per person share
  // positive = owed back; negative = owes others
  const net = new Map<string, number>()
  for (const id of attendeeIds) net.set(id, -perPersonCents)
  for (const e of expenses) {
    net.set(e.paidBy, (net.get(e.paidBy) ?? 0) + e.amount)
  }

  // Greedy settlement
  const settlements: Settlement[] = []
  const creditors = Array.from(net.entries()).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const debtors = Array.from(net.entries()).filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1])

  let ci = 0
  let di = 0
  const cAmounts = creditors.map(([, v]) => v)
  const dAmounts = debtors.map(([, v]) => Math.abs(v))

  while (ci < creditors.length && di < debtors.length) {
    const transfer = Math.min(cAmounts[ci], dAmounts[di])
    if (transfer > 0) {
      settlements.push({
        from: debtors[di][0],
        to: creditors[ci][0],
        amountCents: transfer,
      })
    }
    cAmounts[ci] -= transfer
    dAmounts[di] -= transfer
    if (cAmounts[ci] === 0) ci++
    if (dAmounts[di] === 0) di++
  }

  return settlements
}

// ─── Step 1: Expenses ─────────────────────────────────────────────────────────

function ExpensesStep({
  expenses,
  attendees,
  attendeeUsers,
  onNext,
}: {
  expenses: Expense[]
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  onNext: () => void
}) {
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))
  const attendeeIds = attendees.map((a) => a.userId)
  const totalCents = expenses.reduce((s, e) => s + e.amount, 0)
  const settlements = computeSettlement(expenses, attendeeIds)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Step 1 of 3</p>
        <h2 className="text-xl font-bold text-[var(--fg)] mt-1">Expenses</h2>
      </div>

      {/* Full ledger */}
      <div className="flex flex-col gap-2">
        {expenses.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No expenses recorded.</p>
        ) : (
          expenses.map((e) => {
            const payer = userMap.get(e.paidBy)
            return (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                <div>
                  <p className="text-sm text-[var(--fg)]">{e.description}</p>
                  <p className="text-xs text-[var(--fg-muted)]">paid by {payer?.name ?? 'Unknown'}</p>
                </div>
                <p className="text-sm font-semibold text-[var(--fg)]">
                  ${(e.amount / 100).toFixed(2)}
                </p>
              </div>
            )
          })
        )}
        {expenses.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm font-semibold text-[var(--fg)]">Total</p>
            <p className="text-sm font-semibold text-[var(--fg)]">${(totalCents / 100).toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Settlement */}
      {settlements.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Who Owes Who</p>
          {settlements.map((s, i) => {
            const from = userMap.get(s.from)
            const to = userMap.get(s.to)
            return (
              <p key={i} className="text-sm text-[var(--fg)]">
                <span className="font-medium">{from?.name?.split(' ')[0] ?? 'Someone'}</span>
                {' owes '}
                <span className="font-medium">{to?.name?.split(' ')[0] ?? 'Someone'}</span>
                {' '}
                <span className="font-semibold">${(s.amountCents / 100).toFixed(2)}</span>
              </p>
            )
          })}
        </div>
      )}

      <button
        onClick={onNext}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-xl btn-accent text-base font-semibold"
      >
        Next <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ─── Step 2: Award Voting ─────────────────────────────────────────────────────

function AwardVotingStep({
  event,
  attendees,
  attendeeUsers,
  awardDefs,
  currentAwards,
  awardVoteList,
  currentUserId,
  isSponsor,
  ritualSlug,
  onNext,
}: {
  event: { id: string; year: number }
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  awardDefs: AwardDef[]
  currentAwards: Award[]
  awardVoteList: AwardVote[]
  currentUserId: string
  isSponsor: boolean
  ritualSlug: string
  onNext: () => void
}) {
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))
  const [votingId, startVote] = useTransition()
  const [finalizingId, setFinalizingId] = useState<string | null>(null)
  const [finalizeTransition, startFinalize] = useTransition()

  function handleVote(awardDefId: string, nomineeId: string, existingVoteId?: string) {
    startVote(async () => {
      if (existingVoteId) {
        await retractAwardVote(existingVoteId, ritualSlug, event.year)
      } else {
        await castAwardVote(event.id, ritualSlug, event.year, awardDefId, nomineeId)
      }
    })
  }

  function handleFinalize(awardDefId: string) {
    setFinalizingId(awardDefId)
    startFinalize(async () => {
      await finalizeAwardVotes(event.id, ritualSlug, event.year)
      setFinalizingId(null)
    })
  }

  // Check if all awards are finalized
  const allFinalized = awardDefs.every((def) =>
    currentAwards.some((a) => a.awardDefinitionId === def.id)
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Step 2 of 3</p>
        <h2 className="text-xl font-bold text-[var(--fg)] mt-1">Award Voting</h2>
        <p className="text-sm text-[var(--fg-muted)] mt-1">Cast up to 2 votes per award. No self-votes.</p>
      </div>

      {awardDefs.map((def) => {
        const myVotesForDef = awardVoteList.filter(
          (v) => v.awardDefinitionId === def.id && v.voterId === currentUserId
        )
        const myVoteCount = myVotesForDef.length
        const voteCountByNominee = new Map<string, number>()
        for (const v of awardVoteList.filter((v) => v.awardDefinitionId === def.id)) {
          voteCountByNominee.set(v.nomineeId, (voteCountByNominee.get(v.nomineeId) ?? 0) + 1)
        }
        const winner = currentAwards.find((a) => a.awardDefinitionId === def.id)
        const winnerUser = winner ? userMap.get(winner.winnerId) : null

        return (
          <div key={def.id} className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--fg)]">{def.name}</p>
                <p className="text-xs text-[var(--fg-muted)]">{def.label}</p>
              </div>
              {winnerUser && (
                <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent)]">
                  <Star size={13} className="fill-current" />
                  {winnerUser.name?.split(' ')[0]}
                </div>
              )}
            </div>

            {!winnerUser && (
              <div className="flex flex-wrap gap-2">
                {attendees
                  .filter((a) => a.userId !== currentUserId)
                  .map((attendee) => {
                    const user = userMap.get(attendee.userId)
                    if (!user) return null
                    const existingVote = myVotesForDef.find((v) => v.nomineeId === attendee.userId)
                    const isVoted = !!existingVote
                    const count = voteCountByNominee.get(attendee.userId) ?? 0
                    const disabled = votingId || (!isVoted && myVoteCount >= 2)

                    return (
                      <button
                        key={attendee.userId}
                        onClick={() => handleVote(def.id, attendee.userId, existingVote?.id)}
                        disabled={disabled}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all disabled:opacity-40 ${
                          isVoted
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                            : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg-muted)]'
                        }`}
                      >
                        {user.name?.split(' ')[0] ?? 'Unknown'}
                        {count > 0 && (
                          <span className={`text-xs font-bold ${isVoted ? 'opacity-80' : 'text-[var(--fg-muted)]'}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
              </div>
            )}

            {isSponsor && !winnerUser && (
              <button
                onClick={() => handleFinalize(def.id)}
                disabled={finalizeTransition}
                className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors disabled:opacity-50"
              >
                {finalizeTransition && finalizingId === def.id ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Check size={11} />
                )}
                Finalize votes
              </button>
            )}
          </div>
        )
      })}

      {isSponsor && allFinalized && (
        <button
          onClick={onNext}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl btn-accent text-base font-semibold"
        >
          Next <ChevronRight size={16} />
        </button>
      )}
    </div>
  )
}

// ─── Step 3: Seal ─────────────────────────────────────────────────────────────

function SealStep({
  event,
  attendees,
  attendeeUsers,
  currentAwards,
  awardDefs,
  isSponsor,
  ritualSlug,
}: {
  event: { id: string; location: string | null; year: number }
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  currentAwards: Award[]
  awardDefs: AwardDef[]
  isSponsor: boolean
  ritualSlug: string
}) {
  const [sealing, startSeal] = useTransition()
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))

  function handleSeal() {
    startSeal(async () => {
      await sealEvent(event.id, ritualSlug)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Step 3 of 3</p>
        <h2 className="text-xl font-bold text-[var(--fg)] mt-1">Seal this Chapter</h2>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-4">
        <div>
          <p className="text-xs text-[var(--fg-muted)] uppercase tracking-widest">Location</p>
          <p className="text-lg font-bold text-[var(--fg)] mt-0.5">{event.location ?? '—'}</p>
        </div>

        <div>
          <p className="text-xs text-[var(--fg-muted)] uppercase tracking-widest">Crew</p>
          <p className="text-sm text-[var(--fg)] mt-0.5">
            {attendees
              .map((a) => userMap.get(a.userId)?.name?.split(' ')[0])
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>

        {currentAwards.length > 0 && (
          <div>
            <p className="text-xs text-[var(--fg-muted)] uppercase tracking-widest">Awards</p>
            <div className="flex flex-col gap-1 mt-0.5">
              {currentAwards.map((award) => {
                const def = awardDefs.find((d) => d.id === award.awardDefinitionId)
                const winner = userMap.get(award.winnerId)
                return (
                  <p key={award.id} className="text-sm text-[var(--fg)]">
                    <span className="font-medium">{def?.name}:</span>{' '}
                    {winner?.name ?? 'Unknown'}
                  </p>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {isSponsor && (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSeal}
            disabled={sealing}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white text-base font-semibold transition-colors disabled:opacity-50"
          >
            {sealing ? (
              <><Loader2 size={16} className="animate-spin" /> Sealing…</>
            ) : (
              'Seal this chapter'
            )}
          </button>
          <p className="text-xs text-center text-[var(--fg-muted)]">This cannot be undone.</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Closeout View ───────────────────────────────────────────────────────

export function CloseoutView({
  event,
  attendees,
  attendeeUsers,
  expenseList,
  awardDefs,
  currentAwards,
  awardVoteList,
  currentUserId,
  isSponsor,
  ritualSlug,
  onBack,
}: {
  event: { id: string; location: string | null; year: number }
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  expenseList: Expense[]
  awardDefs: AwardDef[]
  currentAwards: Award[]
  awardVoteList: AwardVote[]
  currentUserId: string
  isSponsor: boolean
  ritualSlug: string
  onBack: () => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Close Out</p>
          <button
            onClick={onBack}
            className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            Back
          </button>
        </div>

        {/* Steps */}
        {step === 1 && (
          <ExpensesStep
            expenses={expenseList}
            attendees={attendees}
            attendeeUsers={attendeeUsers}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <AwardVotingStep
            event={event}
            attendees={attendees}
            attendeeUsers={attendeeUsers}
            awardDefs={awardDefs}
            currentAwards={currentAwards}
            awardVoteList={awardVoteList}
            currentUserId={currentUserId}
            isSponsor={isSponsor}
            ritualSlug={ritualSlug}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <SealStep
            event={event}
            attendees={attendees}
            attendeeUsers={attendeeUsers}
            currentAwards={currentAwards}
            awardDefs={awardDefs}
            isSponsor={isSponsor}
            ritualSlug={ritualSlug}
          />
        )}
      </div>
    </div>
  )
}
