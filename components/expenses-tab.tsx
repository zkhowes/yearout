'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, Trash2, Pencil, ChevronDown, ChevronUp, Check, RotateCcw } from 'lucide-react'
import {
  addExpense,
  deleteExpense,
  updateExpense,
  markSettlementPaid,
  confirmSettlementPayment,
  resetSettlementPayment,
} from '@/lib/event-actions'
import {
  computeBalances,
  computeSettlements,
  type ExpenseInput,
  type PaymentInput,
} from '@/lib/expense-utils'

const CATEGORIES = [
  { value: 'lodging', label: 'Lodging' },
  { value: 'food', label: 'Food' },
  { value: 'transport', label: 'Transport' },
  { value: 'activity', label: 'Activity' },
  { value: 'other', label: 'Other' },
] as const

type Attendee = {
  id: string
  userId: string
  bookingStatus: string
  isHost: boolean
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
  splitType: string
  category: string | null
  createdAt: Date
  splits: { userId: string; amount: number }[]
}

type SettlementPayment = {
  id: string
  eventId: string
  fromUserId: string
  toUserId: string
  amount: number
  status: string
  paidAt: Date | null
  confirmedAt: Date | null
  confirmedBy: string | null
  createdAt: Date
}

type Event = {
  id: string
  year: number
}

// ─── Add/Edit Expense Form ──────────────────────────────────────────────────

function ExpenseForm({
  event,
  attendees,
  attendeeUsers,
  ritualSlug,
  existing,
  onDone,
}: {
  event: Event
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  ritualSlug: string
  existing?: Expense
  onDone: () => void
}) {
  const [description, setDescription] = useState(existing?.description ?? '')
  const [dollarAmount, setDollarAmount] = useState(
    existing ? (existing.amount / 100).toFixed(2) : ''
  )
  const [category, setCategory] = useState<string | null>(existing?.category ?? null)
  const [splitType, setSplitType] = useState<'equal' | 'exact'>(
    (existing?.splitType as 'equal' | 'exact') ?? 'equal'
  )
  const [showSplitOptions, setShowSplitOptions] = useState(
    existing ? true : false
  )

  const activeAttendees = attendees.filter((a) => a.bookingStatus !== 'out')
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))

  // Participant selection
  const defaultChecked = new Set(
    existing?.splits.map((s) => s.userId) ?? activeAttendees.map((a) => a.userId)
  )
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(defaultChecked)

  // Exact amount inputs
  const [exactAmounts, setExactAmounts] = useState<Map<string, string>>(() => {
    if (existing?.splitType === 'exact') {
      const m = new Map<string, string>()
      for (const s of existing.splits) {
        m.set(s.userId, (s.amount / 100).toFixed(2))
      }
      return m
    }
    return new Map()
  })

  const [pending, startTransition] = useTransition()

  function toggleUser(userId: string) {
    setSelectedUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountCents = Math.round(parseFloat(dollarAmount) * 100)
    if (!description.trim() || isNaN(amountCents) || amountCents <= 0) return
    if (selectedUsers.size === 0) return

    const splitUserIds = Array.from(selectedUsers)

    startTransition(async () => {
      if (existing) {
        await updateExpense(existing.id, ritualSlug, event.year, description, amountCents, {
          splitType,
          splitUserIds,
          exactAmounts:
            splitType === 'exact'
              ? splitUserIds.map((uid) => ({
                  userId: uid,
                  amount: Math.round(parseFloat(exactAmounts.get(uid) ?? '0') * 100),
                }))
              : undefined,
          category: category ?? undefined,
        })
      } else {
        await addExpense(event.id, ritualSlug, event.year, description, amountCents, {
          splitType,
          splitUserIds,
          exactAmounts:
            splitType === 'exact'
              ? splitUserIds.map((uid) => ({
                  userId: uid,
                  amount: Math.round(parseFloat(exactAmounts.get(uid) ?? '0') * 100),
                }))
              : undefined,
          category: category ?? undefined,
        })
      }
      onDone()
    })
  }

  const exactSum = Array.from(selectedUsers).reduce(
    (s, uid) => s + (parseFloat(exactAmounts.get(uid) ?? '0') || 0),
    0
  )
  const totalDollars = parseFloat(dollarAmount) || 0
  const exactValid = splitType !== 'exact' || Math.abs(exactSum - totalDollars) < 0.005

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]"
    >
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
        {existing ? 'Edit Expense' : 'Add Expense'}
      </p>

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
      />

      <input
        type="number"
        value={dollarAmount}
        onChange={(e) => setDollarAmount(e.target.value)}
        placeholder="Amount ($)"
        min="0"
        step="0.01"
        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
      />

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setCategory(category === cat.value ? null : cat.value)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
              category === cat.value
                ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg-muted)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Split options toggle */}
      <button
        type="button"
        onClick={() => setShowSplitOptions(!showSplitOptions)}
        className="flex items-center gap-1 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors self-start"
      >
        Split options
        {showSplitOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {showSplitOptions && (
        <div className="flex flex-col gap-3">
          {/* Split type toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSplitType('equal')}
              className={`px-3 py-2 rounded-lg text-xs border transition-all ${
                splitType === 'equal'
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                  : 'border-[var(--border)] text-[var(--fg-muted)]'
              }`}
            >
              Equal
            </button>
            <button
              type="button"
              onClick={() => setSplitType('exact')}
              className={`px-3 py-2 rounded-lg text-xs border transition-all ${
                splitType === 'exact'
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                  : 'border-[var(--border)] text-[var(--fg-muted)]'
              }`}
            >
              Exact
            </button>
          </div>

          {/* Participant checkboxes */}
          <div className="flex flex-col gap-1">
            <p className="text-xs text-[var(--fg-muted)]">Include in split:</p>
            {activeAttendees.map((a) => {
              const user = userMap.get(a.userId)
              return (
                <label key={a.userId} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(a.userId)}
                    onChange={() => toggleUser(a.userId)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-sm text-[var(--fg)]">
                    {user?.name?.split(' ')[0] ?? 'Unknown'}
                  </span>
                  {splitType === 'exact' && selectedUsers.has(a.userId) && (
                    <input
                      type="number"
                      value={exactAmounts.get(a.userId) ?? ''}
                      onChange={(e) => {
                        const next = new Map(exactAmounts)
                        next.set(a.userId, e.target.value)
                        setExactAmounts(next)
                      }}
                      placeholder="$0.00"
                      min="0"
                      step="0.01"
                      className="ml-auto w-20 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-right text-[var(--fg)] placeholder-[var(--fg-muted)]"
                    />
                  )}
                </label>
              )
            })}
          </div>

          {splitType === 'exact' && (
            <p className={`text-xs ${exactValid ? 'text-green-600' : 'text-red-500'}`}>
              Split total: ${exactSum.toFixed(2)} / ${totalDollars.toFixed(2)}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending || !description.trim() || !dollarAmount || !exactValid || selectedUsers.size === 0}
          className="px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={16} />}
          {existing ? 'Save' : 'Add'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Settlement Section ──────────────────────────────────────────────────────

function SettlementSection({
  expenses,
  settlementPayments,
  attendees,
  attendeeUsers,
  currentUserId,
  canEdit,
  ritualSlug,
  event,
}: {
  expenses: Expense[]
  settlementPayments: SettlementPayment[]
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  currentUserId: string
  canEdit: boolean
  ritualSlug: string
  event: Event
}) {
  const [pending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))

  // Convert to ExpenseInput/PaymentInput for the utils
  const expenseInputs: ExpenseInput[] = expenses.map((e) => ({
    id: e.id,
    paidBy: e.paidBy,
    amount: e.amount,
    splits: e.splits,
  }))

  const paymentInputs: PaymentInput[] = settlementPayments.map((p) => ({
    id: p.id,
    fromUserId: p.fromUserId,
    toUserId: p.toUserId,
    amount: p.amount,
    status: p.status as 'pending' | 'paid' | 'confirmed',
  }))

  const participantIds = attendees.filter((a) => a.bookingStatus !== 'out').map((a) => a.userId)

  // Current user's balance
  const balances = computeBalances(expenseInputs, paymentInputs, participantIds)
  const myBalance = balances.get(currentUserId) ?? 0

  // Minimum transactions
  const settlements = computeSettlements(expenseInputs, paymentInputs, participantIds)

  function handleMarkPaid(toUserId: string, amountCents: number) {
    setActionId(`pay-${toUserId}`)
    startTransition(async () => {
      await markSettlementPaid(event.id, ritualSlug, event.year, toUserId, amountCents)
      setActionId(null)
    })
  }

  function handleConfirm(paymentId: string) {
    setActionId(`confirm-${paymentId}`)
    startTransition(async () => {
      await confirmSettlementPayment(paymentId, ritualSlug, event.year)
      setActionId(null)
    })
  }

  function handleReset(paymentId: string) {
    setActionId(`reset-${paymentId}`)
    startTransition(async () => {
      await resetSettlementPayment(paymentId, ritualSlug, event.year)
      setActionId(null)
    })
  }

  const getName = (uid: string) => userMap.get(uid)?.name?.split(' ')[0] ?? 'Unknown'

  return (
    <div className="flex flex-col gap-4">
      {/* Personal balance summary */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <p className={`text-lg font-bold ${myBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {myBalance >= 0
            ? `You are owed $${(myBalance / 100).toFixed(2)}`
            : `You owe $${(Math.abs(myBalance) / 100).toFixed(2)}`}
        </p>
        {/* Personalized actions */}
        {settlements
          .filter((s) => s.from === currentUserId || s.to === currentUserId)
          .map((s, i) => (
            <p key={i} className="text-sm text-[var(--fg-muted)] mt-1">
              {s.from === currentUserId
                ? `Venmo @${getName(s.to)} $${(s.amountCents / 100).toFixed(2)}`
                : `Collect $${(s.amountCents / 100).toFixed(2)} from @${getName(s.from)}`}
            </p>
          ))}
      </div>

      {/* All settlements */}
      {settlements.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Settlements</p>
          {settlements.map((s, i) => {
            // Find matching payment record
            const payment = settlementPayments.find(
              (p) => p.fromUserId === s.from && p.toUserId === s.to
            )
            const isDebtor = s.from === currentUserId
            const isCreditor = s.to === currentUserId

            return (
              <div key={i} className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                <div className="flex-1">
                  <p className="text-sm text-[var(--fg)]">
                    <span className="font-medium">{getName(s.from)}</span>
                    {' owes '}
                    <span className="font-medium">{getName(s.to)}</span>
                    {' '}
                    <span className="font-semibold">${(s.amountCents / 100).toFixed(2)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {payment?.status === 'confirmed' && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <Check size={14} /> Confirmed
                    </span>
                  )}
                  {payment?.status === 'paid' && (
                    <>
                      <span className="text-xs text-amber-600 font-medium">Paid</span>
                      {(isCreditor || canEdit) && (
                        <button
                          onClick={() => handleConfirm(payment.id)}
                          disabled={pending && actionId === `confirm-${payment.id}`}
                          className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-600 font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50"
                        >
                          {pending && actionId === `confirm-${payment.id}` ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            'Confirm'
                          )}
                        </button>
                      )}
                    </>
                  )}
                  {(!payment || payment.status === 'pending') && isDebtor && (
                    <button
                      onClick={() => handleMarkPaid(s.to, s.amountCents)}
                      disabled={pending && actionId === `pay-${s.to}`}
                      className="px-2 py-1 rounded text-xs bg-[var(--accent)] text-[var(--accent-fg)] font-medium hover:opacity-80 transition-colors disabled:opacity-50"
                    >
                      {pending && actionId === `pay-${s.to}` ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        'Mark Paid'
                      )}
                    </button>
                  )}
                  {canEdit && payment && payment.status !== 'pending' && (
                    <button
                      onClick={() => handleReset(payment.id)}
                      disabled={pending && actionId === `reset-${payment.id}`}
                      title="Reset"
                      className="p-2 text-[var(--fg-muted)] hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {pending && actionId === `reset-${payment.id}` ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <RotateCcw size={16} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Expenses Tab ──────────────────────────────────────────────────────

export function ExpensesTab({
  event,
  expenseList,
  settlementPayments,
  attendees,
  attendeeUsers,
  currentUserId,
  canEdit,
  ritualSlug,
}: {
  event: Event & { location?: string | null; mountains?: string | null; startDate?: Date | null; endDate?: Date | null }
  expenseList: Expense[]
  settlementPayments: SettlementPayment[]
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  currentUserId: string
  canEdit: boolean
  ritualSlug: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleting, startDelete] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))
  const attendeeIds = attendees.filter((a) => a.bookingStatus !== 'out').map((a) => a.userId)

  const totalCents = expenseList.reduce((s, e) => s + e.amount, 0)

  function handleDelete(expenseId: string) {
    setDeletingId(expenseId)
    startDelete(async () => {
      await deleteExpense(expenseId, ritualSlug, event.year)
      setDeletingId(null)
    })
  }

  function getSplitLabel(expense: Expense) {
    const splitCount = expense.splits.length
    const totalAttendees = attendeeIds.length
    if (expense.splitType === 'exact') return 'Custom'
    if (splitCount === totalAttendees) return `${splitCount}-way`
    return `${splitCount} of ${totalAttendees}`
  }

  const getCategoryLabel = (cat: string | null) => {
    if (!cat) return null
    return CATEGORIES.find((c) => c.value === cat)?.label ?? cat
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Balance summary + settlements */}
      {expenseList.length > 0 && (
        <SettlementSection
          expenses={expenseList}
          settlementPayments={settlementPayments}
          attendees={attendees}
          attendeeUsers={attendeeUsers}
          currentUserId={currentUserId}
          canEdit={canEdit}
          ritualSlug={ritualSlug}
          event={event}
        />
      )}

      {/* Add/Edit form */}
      {(showForm || editingExpense) ? (
        <ExpenseForm
          event={event}
          attendees={attendees}
          attendeeUsers={attendeeUsers}
          ritualSlug={ritualSlug}
          existing={editingExpense ?? undefined}
          onDone={() => {
            setShowForm(false)
            setEditingExpense(null)
          }}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
        >
          <Plus size={16} /> Add expense
        </button>
      )}

      {/* Expense list */}
      {expenseList.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)] text-center py-4">No expenses yet.</p>
      ) : (
        <>
          {expenseList.map((e) => {
            const payer = userMap.get(e.paidBy)
            const isOwn = e.paidBy === currentUserId
            const isExpanded = expandedId === e.id

            return (
              <div key={e.id} className="flex flex-col border-b border-[var(--border)]">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : e.id)}
                  className="flex items-center justify-between py-3 w-full text-left"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-[var(--fg)]">{e.description}</p>
                      {e.category && (
                        <span className="text-xs px-1.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--fg-muted)]">
                          {getCategoryLabel(e.category)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--fg-muted)]">
                      {payer?.name?.split(' ')[0] ?? 'Unknown'}
                      <span className="mx-1">·</span>
                      {getSplitLabel(e)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--fg)]">
                      ${(e.amount / 100).toFixed(2)}
                    </p>
                    {isExpanded ? <ChevronUp size={14} className="text-[var(--fg-muted)]" /> : <ChevronDown size={14} className="text-[var(--fg-muted)]" />}
                  </div>
                </button>

                {/* Expanded per-person breakdown */}
                {isExpanded && (
                  <div className="pb-2 flex flex-col gap-1">
                    {e.splits.map((s) => {
                      const splitUser = userMap.get(s.userId)
                      return (
                        <div key={s.userId} className="flex items-center justify-between pl-2 text-xs">
                          <span className="text-[var(--fg-muted)]">
                            {splitUser?.name?.split(' ')[0] ?? 'Unknown'}
                          </span>
                          <span className="text-[var(--fg-muted)]">
                            ${(s.amount / 100).toFixed(2)}
                          </span>
                        </div>
                      )
                    })}
                    {isOwn && (
                      <div className="flex gap-2 pt-1 pl-2">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation()
                            setEditingExpense(e)
                            setExpandedId(null)
                          }}
                          className="flex items-center gap-1 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
                        >
                          <Pencil size={16} /> Edit
                        </button>
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation()
                            handleDelete(e.id)
                          }}
                          disabled={deleting && deletingId === e.id}
                          className="flex items-center gap-1 text-xs text-[var(--fg-muted)] hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          {deleting && deletingId === e.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <><Trash2 size={16} /> Delete</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Total */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm font-semibold text-[var(--fg)]">Total</p>
            <p className="text-sm font-semibold text-[var(--fg)]">${(totalCents / 100).toFixed(2)}</p>
          </div>
        </>
      )}
    </div>
  )
}
