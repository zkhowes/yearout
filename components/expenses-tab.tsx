'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, Trash2, Pencil, ChevronDown, ChevronUp, Check, RotateCcw, DollarSign, CircleCheck, Circle } from 'lucide-react'
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

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'CAD', symbol: 'C$', label: 'CAD' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'GBP', symbol: '£', label: 'GBP' },
  { code: 'MXN', symbol: 'MX$', label: 'MXN' },
  { code: 'JPY', symbol: '¥', label: 'JPY' },
  { code: 'AUD', symbol: 'A$', label: 'AUD' },
  { code: 'CHF', symbol: 'Fr', label: 'CHF' },
] as const

// Approximate exchange rates to USD (updated periodically)
const TO_USD_RATES: Record<string, number> = {
  USD: 1,
  CAD: 0.72,
  EUR: 1.08,
  GBP: 1.27,
  MXN: 0.058,
  JPY: 0.0067,
  AUD: 0.65,
  CHF: 1.13,
}

function convertToUsd(amountCents: number, currency: string): number {
  const rate = TO_USD_RATES[currency] ?? 1
  return Math.round(amountCents * rate)
}

function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code
}

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
  currency: string
  originalAmount: number | null
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

export function ExpenseForm({
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
  const [currency, setCurrency] = useState(existing?.currency ?? 'USD')
  const [dollarAmount, setDollarAmount] = useState(
    existing
      ? ((existing.originalAmount ?? existing.amount) / 100).toFixed(2)
      : ''
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
    const originalCents = Math.round(parseFloat(dollarAmount) * 100)
    if (!description.trim() || isNaN(originalCents) || originalCents <= 0) return
    if (selectedUsers.size === 0) return

    // Convert to USD for settlement math
    const usdCents = currency === 'USD' ? originalCents : convertToUsd(originalCents, currency)

    const splitUserIds = Array.from(selectedUsers)

    // For exact splits, amounts are entered in the original currency — convert to USD
    const exactRate = currency === 'USD' ? 1 : (TO_USD_RATES[currency] ?? 1)

    startTransition(async () => {
      const opts = {
        splitType,
        splitUserIds,
        exactAmounts:
          splitType === 'exact'
            ? splitUserIds.map((uid) => ({
                userId: uid,
                amount: Math.round(parseFloat(exactAmounts.get(uid) ?? '0') * 100 * exactRate),
              }))
            : undefined,
        category: category ?? undefined,
        currency,
        originalAmountCents: currency !== 'USD' ? originalCents : undefined,
      }
      if (existing) {
        await updateExpense(existing.id, ritualSlug, event.year, description, usdCents, opts)
      } else {
        await addExpense(event.id, ritualSlug, event.year, description, usdCents, opts)
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

      <div className="flex gap-2 items-end">
        <input
          type="number"
          value={dollarAmount}
          onChange={(e) => setDollarAmount(e.target.value)}
          placeholder={`Amount (${getCurrencySymbol(currency)})`}
          min="0"
          step="0.01"
          className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-2 text-sm text-[var(--fg)] w-20"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </div>
      {currency !== 'USD' && dollarAmount && (
        <p className="text-xs text-[var(--fg-muted)]">
          ~${(convertToUsd(Math.round(parseFloat(dollarAmount) * 100), currency) / 100).toFixed(2)} USD
        </p>
      )}

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

// ─── Crew Status Strip ──────────────────────────────────────────────────────

type CrewMemberStatus = 'none' | 'has_expenses' | 'settled'

function getCrewStatus(
  userId: string,
  expenses: Expense[],
  balances: Map<string, number>,
  settlements: { from: string; to: string; amountCents: number }[],
  settlementPayments: SettlementPayment[]
): CrewMemberStatus {
  // Check if user has paid for any expense
  const hasExpenses = expenses.some((e) => e.paidBy === userId)
  if (!hasExpenses) return 'none'

  // Check if settled: balance is 0, OR all their settlements are confirmed
  const balance = balances.get(userId) ?? 0
  if (balance === 0) {
    // Also check all their settlements are confirmed
    const mySettlements = settlements.filter((s) => s.from === userId || s.to === userId)
    if (mySettlements.length === 0) return 'settled'
    const allConfirmed = mySettlements.every((s) => {
      const payment = settlementPayments.find(
        (p) => p.fromUserId === s.from && p.toUserId === s.to
      )
      return payment?.status === 'confirmed'
    })
    return allConfirmed ? 'settled' : 'has_expenses'
  }

  // Check if all their settlements are confirmed (even if balance shows residual rounding)
  const mySettlements = settlements.filter((s) => s.from === userId || s.to === userId)
  if (mySettlements.length > 0) {
    const allConfirmed = mySettlements.every((s) => {
      const payment = settlementPayments.find(
        (p) => p.fromUserId === s.from && p.toUserId === s.to
      )
      return payment?.status === 'confirmed'
    })
    if (allConfirmed) return 'settled'
  }

  return 'has_expenses'
}

function CrewStatusStrip({
  attendees,
  attendeeUsers,
  expenses,
  balances,
  settlements,
  settlementPayments,
}: {
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  expenses: Expense[]
  balances: Map<string, number>
  settlements: { from: string; to: string; amountCents: number }[]
  settlementPayments: SettlementPayment[]
}) {
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))
  const activeAttendees = attendees.filter((a) => a.bookingStatus !== 'out')

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {activeAttendees.map((a) => {
        const user = userMap.get(a.userId)
        const status = getCrewStatus(a.userId, expenses, balances, settlements, settlementPayments)
        const firstName = user?.name?.split(' ')[0] ?? '?'
        const initials = firstName[0]?.toUpperCase() ?? '?'

        return (
          <div key={a.userId} className="flex flex-col items-center gap-1 shrink-0">
            <div className="relative">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={firstName}
                  className={`w-10 h-10 rounded-full object-cover border-2 ${
                    status === 'settled'
                      ? 'border-green-500'
                      : status === 'has_expenses'
                        ? 'border-[var(--accent)]'
                        : 'border-[var(--border)]'
                  }`}
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 ${
                    status === 'settled'
                      ? 'border-green-500 bg-green-500/10 text-green-600'
                      : status === 'has_expenses'
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)]'
                  }`}
                >
                  {initials}
                </div>
              )}
              {/* Status badge */}
              <div className="absolute -bottom-0.5 -right-0.5">
                {status === 'settled' ? (
                  <CircleCheck size={16} className="text-green-500 bg-[var(--bg)] rounded-full" />
                ) : status === 'has_expenses' ? (
                  <DollarSign size={16} className="text-[var(--accent)] bg-[var(--bg)] rounded-full" />
                ) : (
                  <Circle size={16} className="text-[var(--fg-muted)] bg-[var(--bg)] rounded-full opacity-40" />
                )}
              </div>
            </div>
            <span className="text-[10px] text-[var(--fg-muted)] leading-tight">{firstName}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Balance Bar Chart ──────────────────────────────────────────────────────

function BalanceBarChart({
  balances,
  attendeeUsers,
  expenses,
}: {
  balances: Map<string, number>
  attendeeUsers: AttendeeUser[]
  expenses: Expense[]
}) {
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))

  // Compute per-person total spent (what they fronted)
  const spent = new Map<string, number>()
  for (const e of expenses) {
    spent.set(e.paidBy, (spent.get(e.paidBy) ?? 0) + e.amount)
  }

  // Build entries sorted by balance descending
  const entries = Array.from(balances.entries())
    .filter(([, bal]) => bal !== 0)
    .sort((a, b) => b[1] - a[1])

  if (entries.length === 0) return null

  const maxAbs = Math.max(...entries.map(([, bal]) => Math.abs(bal)))

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Balances</p>
      <div className="flex flex-col gap-1.5">
        {entries.map(([userId, balance]) => {
          const user = userMap.get(userId)
          const firstName = user?.name?.split(' ')[0] ?? 'Unknown'
          const isPositive = balance > 0
          const pct = maxAbs > 0 ? (Math.abs(balance) / maxAbs) * 100 : 0
          const userSpent = spent.get(userId) ?? 0

          return (
            <div key={userId} className="flex items-center gap-2">
              <span className="text-xs text-[var(--fg-muted)] w-16 shrink-0 truncate">{firstName}</span>
              <div className="flex-1 h-6 relative bg-[var(--surface)] rounded overflow-hidden">
                <div
                  className={`absolute top-0 h-full rounded transition-all ${
                    isPositive ? 'bg-green-500/30 left-0' : 'bg-red-400/30 right-0'
                  }`}
                  style={{ width: `${Math.max(pct, 4)}%` }}
                />
                <div className="absolute inset-0 flex items-center px-2">
                  <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                    {isPositive ? '+' : '-'}${(Math.abs(balance) / 100).toFixed(2)}
                  </span>
                  {userSpent > 0 && (
                    <span className="text-[10px] text-[var(--fg-muted)] ml-auto">
                      paid ${(userSpent / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── You Card (personal balance) ─────────────────────────────────────────────

function YouCard({
  myBalance,
  settlements,
  settlementPayments,
  currentUserId,
  canEdit,
  pending,
  actionId,
  handleMarkPaid,
  handleConfirm,
  getName,
}: {
  myBalance: number
  settlements: { from: string; to: string; amountCents: number }[]
  settlementPayments: SettlementPayment[]
  currentUserId: string
  canEdit: boolean
  pending: boolean
  actionId: string | null
  handleMarkPaid: (toUserId: string, amountCents: number) => void
  handleConfirm: (paymentId: string) => void
  getName: (uid: string) => string
}) {
  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <p className={`text-lg font-bold ${myBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
        {myBalance >= 0
          ? `You are owed $${(myBalance / 100).toFixed(2)}`
          : `You owe $${(Math.abs(myBalance) / 100).toFixed(2)}`}
      </p>
      {settlements
        .filter((s) => s.from === currentUserId || s.to === currentUserId)
        .map((s, i) => {
          const payment = settlementPayments.find(
            (p) => p.fromUserId === s.from && p.toUserId === s.to
          )
          const isDebtor = s.from === currentUserId
          const isCreditor = s.to === currentUserId

          return (
            <div key={i} className="flex items-center justify-between mt-2 gap-2">
              <p className="text-sm text-[var(--fg-muted)]">
                {isDebtor
                  ? `Venmo @${getName(s.to)} $${(s.amountCents / 100).toFixed(2)}`
                  : `Collect $${(s.amountCents / 100).toFixed(2)} from @${getName(s.from)}`}
              </p>
              <div className="shrink-0">
                {payment?.status === 'confirmed' ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Check size={14} /> Done
                  </span>
                ) : payment?.status === 'paid' ? (
                  isCreditor || canEdit ? (
                    <button
                      onClick={() => handleConfirm(payment.id)}
                      disabled={pending && actionId === `confirm-${payment.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs bg-green-500/20 text-green-600 font-semibold hover:bg-green-500/30 transition-colors disabled:opacity-50"
                    >
                      {pending && actionId === `confirm-${payment.id}` ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        'Confirm Receipt'
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">Pending confirm</span>
                  )
                ) : isDebtor ? (
                  <button
                    onClick={() => handleMarkPaid(s.to, s.amountCents)}
                    disabled={pending && actionId === `pay-${s.to}`}
                    className="px-3 py-1.5 rounded-lg text-xs bg-[var(--accent)] text-[var(--accent-fg)] font-semibold hover:opacity-80 transition-colors disabled:opacity-50"
                  >
                    {pending && actionId === `pay-${s.to}` ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      'Mark Paid'
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
    </div>
  )
}

// ─── Settlements Table ───────────────────────────────────────────────────────

function SettlementsTable({
  settlements,
  settlementPayments,
  currentUserId,
  canEdit,
  pending,
  actionId,
  handleMarkPaid,
  handleConfirm,
  handleReset,
  getName,
}: {
  settlements: { from: string; to: string; amountCents: number }[]
  settlementPayments: SettlementPayment[]
  currentUserId: string
  canEdit: boolean
  pending: boolean
  actionId: string | null
  handleMarkPaid: (toUserId: string, amountCents: number) => void
  handleConfirm: (paymentId: string) => void
  handleReset: (paymentId: string) => void
  getName: (uid: string) => string
}) {
  if (settlements.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Settlements</p>
      {settlements.map((s, i) => {
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
  )
}

// ─── Category Breakdown Chart ────────────────────────────────────────────────

function CategoryBreakdownChart({
  categoryData,
}: {
  categoryData: { label: string; amountCents: number; pct: number }[]
}) {
  if (categoryData.length === 0) return null

  const maxAmount = Math.max(...categoryData.map((c) => c.amountCents))

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">By Category</p>
      <div className="flex flex-col gap-1.5">
        {categoryData.map((cat) => {
          const pct = maxAmount > 0 ? (cat.amountCents / maxAmount) * 100 : 0
          return (
            <div key={cat.label} className="flex items-center gap-2">
              <span className="text-xs text-[var(--fg-muted)] w-16 shrink-0 truncate">{cat.label}</span>
              <div className="flex-1 h-6 relative bg-[var(--surface)] rounded overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full rounded bg-[var(--accent)]/30 transition-all"
                  style={{ width: `${Math.max(pct, 4)}%` }}
                />
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-xs font-medium text-[var(--fg)]">
                    ${(cat.amountCents / 100).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-[var(--fg-muted)] ml-auto">
                    {cat.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Category Table ──────────────────────────────────────────────────────────

function CategoryTable({
  categoryData,
}: {
  categoryData: { label: string; amountCents: number; pct: number }[]
}) {
  if (categoryData.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Category Breakdown</p>
      {categoryData.map((cat) => (
        <div key={cat.label} className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
          <span className="text-sm text-[var(--fg)]">{cat.label}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--fg-muted)]">{cat.pct.toFixed(0)}%</span>
            <span className="text-sm font-medium text-[var(--fg)]">${(cat.amountCents / 100).toFixed(2)}</span>
          </div>
        </div>
      ))}
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

  // Compute balances and settlements (shared across components)
  const expenseInputs: ExpenseInput[] = expenseList.map((e) => ({
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
  const balances = computeBalances(expenseInputs, paymentInputs, attendeeIds)
  const settlements = computeSettlements(expenseInputs, paymentInputs, attendeeIds)
  const myBalance = balances.get(currentUserId) ?? 0

  // Lifted settlement action state
  const [settlePending, startSettle] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)

  function handleMarkPaid(toUserId: string, amountCents: number) {
    setActionId(`pay-${toUserId}`)
    startSettle(async () => {
      await markSettlementPaid(event.id, ritualSlug, event.year, toUserId, amountCents)
      setActionId(null)
    })
  }

  function handleConfirm(paymentId: string) {
    setActionId(`confirm-${paymentId}`)
    startSettle(async () => {
      await confirmSettlementPayment(paymentId, ritualSlug, event.year)
      setActionId(null)
    })
  }

  function handleReset(paymentId: string) {
    setActionId(`reset-${paymentId}`)
    startSettle(async () => {
      await resetSettlementPayment(paymentId, ritualSlug, event.year)
      setActionId(null)
    })
  }

  const getName = (uid: string) => userMap.get(uid)?.name?.split(' ')[0] ?? 'Unknown'

  // Category aggregation (shared by chart + table)
  const categoryData = (() => {
    if (expenseList.length === 0) return []
    const totals = new Map<string, number>()
    for (const e of expenseList) {
      const key = e.category ?? 'other'
      totals.set(key, (totals.get(key) ?? 0) + e.amount)
    }
    return Array.from(totals.entries())
      .map(([key, amountCents]) => ({
        label: CATEGORIES.find((c) => c.value === key)?.label ?? 'Other',
        amountCents,
        pct: totalCents > 0 ? (amountCents / totalCents) * 100 : 0,
      }))
      .sort((a, b) => b.amountCents - a.amountCents)
  })()

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
      {/* 1. Add/Edit form */}
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

      {/* 2. Crew status + You card (side by side) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <CrewStatusStrip
            attendees={attendees}
            attendeeUsers={attendeeUsers}
            expenses={expenseList}
            balances={balances}
            settlements={settlements}
            settlementPayments={settlementPayments}
          />
          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] text-[var(--fg-muted)]">
            <span className="flex items-center gap-1">
              <Circle size={12} className="opacity-40" /> Not started
            </span>
            <span className="flex items-center gap-1">
              <DollarSign size={12} className="text-[var(--accent)]" /> Active
            </span>
            <span className="flex items-center gap-1">
              <CircleCheck size={12} className="text-green-500" /> Settled
            </span>
          </div>
        </div>
        {expenseList.length > 0 && (
          <YouCard
            myBalance={myBalance}
            settlements={settlements}
            settlementPayments={settlementPayments}
            currentUserId={currentUserId}
            canEdit={canEdit}
            pending={settlePending}
            actionId={actionId}
            handleMarkPaid={handleMarkPaid}
            handleConfirm={handleConfirm}
            getName={getName}
          />
        )}
      </div>

      {/* 3. Balances bar chart */}
      {expenseList.length > 0 && (
        <BalanceBarChart
          balances={balances}
          attendeeUsers={attendeeUsers}
          expenses={expenseList}
        />
      )}

      {/* 4. Settlements table */}
      {expenseList.length > 0 && (
        <SettlementsTable
          settlements={settlements}
          settlementPayments={settlementPayments}
          currentUserId={currentUserId}
          canEdit={canEdit}
          pending={settlePending}
          actionId={actionId}
          handleMarkPaid={handleMarkPaid}
          handleConfirm={handleConfirm}
          handleReset={handleReset}
          getName={getName}
        />
      )}

      {/* 5. Category breakdown chart */}
      <CategoryBreakdownChart categoryData={categoryData} />

      {/* 6. Category breakdown table */}
      <CategoryTable categoryData={categoryData} />

      {/* 7. Expense list + totals */}
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
                    <div className="text-right">
                      {e.currency !== 'USD' && e.originalAmount ? (
                        <>
                          <p className="text-sm font-semibold text-[var(--fg)]">
                            {getCurrencySymbol(e.currency)}{(e.originalAmount / 100).toFixed(2)}
                          </p>
                          <p className="text-xs text-[var(--fg-muted)]">
                            ~${(e.amount / 100).toFixed(2)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-semibold text-[var(--fg)]">
                          ${(e.amount / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
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
