'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, Star, Trash2, Trophy } from 'lucide-react'
import {
  addExpense,
  deleteExpense,
  addLoreEntry,
  toggleLoreHOF,
  addActivityResult,
  setAwardWinner,
} from '@/lib/event-actions'
import { CloseoutView } from './closeout-view'

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

type LoreEntry = {
  id: string
  authorId: string
  type: 'memory' | 'checkin' | 'image'
  content: string | null
  location: string | null
  isHallOfFame: boolean
  day: Date | null
  createdAt: Date
}

type ActivityResult = {
  id: string
  userId: string
  metric: string
  value: string
  unit: string | null
  day: Date | null
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

type Event = {
  id: string
  location: string | null
  mountains: string | null
  year: number
}

// ─── Expense Settlement Math ──────────────────────────────────────────────────

function computeNetPerPerson(expenses: Expense[], attendeeIds: string[]) {
  if (attendeeIds.length === 0) return new Map<string, number>()
  const totalCents = expenses.reduce((s, e) => s + e.amount, 0)
  const perPersonCents = Math.round(totalCents / attendeeIds.length)
  const net = new Map<string, number>()
  for (const id of attendeeIds) net.set(id, -perPersonCents)
  for (const e of expenses) {
    net.set(e.paidBy, (net.get(e.paidBy) ?? 0) + e.amount)
  }
  return net
}

// ─── Awards Podium ────────────────────────────────────────────────────────────

function AwardsPodium({
  event,
  attendees,
  attendeeUsers,
  awardDefs,
  currentAwards,
  isSponsor,
  ritualSlug,
}: {
  event: Event
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  awardDefs: AwardDef[]
  currentAwards: Award[]
  isSponsor: boolean
  ritualSlug: string
}) {
  const [assigning, startAssign] = useTransition()
  const [pickerDefId, setPickerDefId] = useState<string | null>(null)
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))

  const mvpDef = awardDefs.find((d) => d.type === 'mvp')
  const lupDef = awardDefs.find((d) => d.type === 'lup')
  const runnerUpDef = awardDefs.find((d) => d.type === 'runner_up')

  const mvpWinner = mvpDef ? currentAwards.find((a) => a.awardDefinitionId === mvpDef.id) : null
  const lupWinner = lupDef ? currentAwards.find((a) => a.awardDefinitionId === lupDef.id) : null
  const runnerUpWinner = runnerUpDef ? currentAwards.find((a) => a.awardDefinitionId === runnerUpDef.id) : null

  function handleAssign(defId: string, winnerId: string) {
    setPickerDefId(null)
    startAssign(async () => {
      await setAwardWinner(event.id, ritualSlug, event.year, defId, winnerId)
    })
  }

  function AwardColumn({
    def,
    winner,
    size = 'normal',
  }: {
    def: AwardDef | undefined
    winner: Award | null | undefined
    size?: 'normal' | 'hero'
  }) {
    if (!def) return null
    const winnerUser = winner ? userMap.get(winner.winnerId) : null

    return (
      <div className={`flex flex-col items-center gap-2 ${size === 'hero' ? 'flex-1' : 'flex-1'}`}>
        <div
          className={`flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] w-full gap-2 ${
            size === 'hero' ? 'p-4 min-h-[120px]' : 'p-3 min-h-[100px]'
          }`}
        >
          {winnerUser ? (
            <>
              {winnerUser.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={winnerUser.image}
                  alt={winnerUser.name ?? ''}
                  className={`rounded-full object-cover ${size === 'hero' ? 'w-14 h-14' : 'w-10 h-10'}`}
                />
              ) : (
                <div
                  className={`rounded-full bg-[var(--border)] flex items-center justify-center font-semibold text-[var(--fg-muted)] ${
                    size === 'hero' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-base'
                  }`}
                >
                  {(winnerUser.name ?? '?').charAt(0).toUpperCase()}
                </div>
              )}
              <p className={`font-semibold text-[var(--fg)] text-center ${size === 'hero' ? 'text-sm' : 'text-xs'}`}>
                {winnerUser.name?.split(' ')[0] ?? 'Unknown'}
              </p>
            </>
          ) : isSponsor ? (
            <button
              onClick={() => setPickerDefId(def.id)}
              disabled={assigning}
              className="flex flex-col items-center gap-1 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors disabled:opacity-50"
            >
              <Trophy size={size === 'hero' ? 24 : 18} />
              <span className="text-[10px]">Assign</span>
            </button>
          ) : (
            <Trophy size={size === 'hero' ? 24 : 18} className="text-[var(--border)]" />
          )}
        </div>
        <p className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] text-center">{def.name}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Awards</p>
      <div className="flex gap-2 items-end">
        <AwardColumn def={runnerUpDef} winner={runnerUpWinner} size="normal" />
        <AwardColumn def={mvpDef} winner={mvpWinner} size="hero" />
        <AwardColumn def={lupDef} winner={lupWinner} size="normal" />
      </div>

      {/* Inline attendee picker */}
      {pickerDefId && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 flex flex-col gap-2">
          <p className="text-xs text-[var(--fg-muted)]">Select winner</p>
          <div className="flex flex-wrap gap-2">
            {attendees.map((a) => {
              const user = userMap.get(a.userId)
              if (!user) return null
              return (
                <button
                  key={a.userId}
                  onClick={() => handleAssign(pickerDefId, a.userId)}
                  disabled={assigning}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--fg)] hover:bg-[var(--border)] transition-colors disabled:opacity-50"
                >
                  {user.name?.split(' ')[0] ?? 'Unknown'}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setPickerDefId(null)}
            className="self-start text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Lore Tab ─────────────────────────────────────────────────────────────────

function LoreTab({
  event,
  loreList,
  attendeeUsers,
  currentUserId,
  isSponsor,
  ritualSlug,
}: {
  event: Event
  loreList: LoreEntry[]
  attendeeUsers: AttendeeUser[]
  currentUserId: string
  isSponsor: boolean
  ritualSlug: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<'memory' | 'checkin'>('memory')
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [day, setDay] = useState('')
  const [pending, startSubmit] = useTransition()
  const [toggling, startToggle] = useTransition()
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    startSubmit(async () => {
      await addLoreEntry(
        event.id,
        ritualSlug,
        event.year,
        type,
        content,
        location.trim() || undefined,
        day ? new Date(day) : undefined
      )
      setContent('')
      setLocation('')
      setDay('')
      setShowForm(false)
    })
  }

  function handleToggleHOF(entryId: string) {
    startToggle(async () => {
      await toggleLoreHOF(entryId, ritualSlug, event.year)
    })
  }

  const sorted = [...loreList].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="flex flex-col gap-4">
      {showForm ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">New Entry</p>

          {/* Type toggle */}
          <div className="flex gap-2">
            {(['memory', 'checkin'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-1 rounded-lg text-xs border transition-all capitalize ${
                  type === t
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                    : 'border-[var(--border)] text-[var(--fg-muted)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={type === 'memory' ? 'What happened?' : 'Where are you?'}
            rows={3}
            className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] resize-none"
          />
          {type === 'checkin' && (
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
          )}
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
          />

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending || !content.trim()}
              className="px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
            >
              {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
        >
          <Plus size={13} /> Add lore
        </button>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)] text-center py-4">No lore yet. Be the first to add a memory.</p>
      ) : (
        sorted.map((entry) => {
          const author = userMap.get(entry.authorId)
          const canToggleHOF = entry.authorId === currentUserId || isSponsor

          return (
            <div key={entry.id} className="flex flex-col gap-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5 flex-1">
                  <p className="text-sm text-[var(--fg)]">{entry.content}</p>
                  {entry.location && (
                    <p className="text-xs text-[var(--fg-muted)]">@ {entry.location}</p>
                  )}
                </div>
                {canToggleHOF && (
                  <button
                    onClick={() => handleToggleHOF(entry.id)}
                    disabled={toggling}
                    className={`p-1 rounded transition-colors disabled:opacity-50 ${
                      entry.isHallOfFame
                        ? 'text-[var(--accent)]'
                        : 'text-[var(--border)] hover:text-[var(--fg-muted)]'
                    }`}
                    aria-label="Toggle Hall of Fame"
                  >
                    <Star size={14} className={entry.isHallOfFame ? 'fill-current' : ''} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                <span className="capitalize">{entry.type}</span>
                <span>·</span>
                <span>{author?.name?.split(' ')[0] ?? 'Unknown'}</span>
                {entry.day && (
                  <>
                    <span>·</span>
                    <span>{new Date(entry.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

const SKI_METRICS = ['fastest_speed', 'skier_cross_wins', 'vertical_feet']

function StatsTab({
  event,
  activityList,
  attendees,
  attendeeUsers,
  currentUserId,
  isSponsor,
  ritualSlug,
}: {
  event: Event
  activityList: ActivityResult[]
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  currentUserId: string
  isSponsor: boolean
  ritualSlug: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [userId, setUserId] = useState(currentUserId)
  const [metric, setMetric] = useState('')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('')
  const [day, setDay] = useState('')
  const [pending, startSubmit] = useTransition()
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!metric.trim() || !value.trim()) return
    startSubmit(async () => {
      await addActivityResult(
        event.id,
        ritualSlug,
        event.year,
        userId,
        metric,
        value,
        unit.trim() || undefined,
        day ? new Date(day) : undefined
      )
      setMetric('')
      setValue('')
      setUnit('')
      setDay('')
      setShowForm(false)
    })
  }

  // Group by day
  const byDay = new Map<string, ActivityResult[]>()
  for (const r of activityList) {
    const key = r.day
      ? new Date(r.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'Undated'
    const group = byDay.get(key) ?? []
    group.push(r)
    byDay.set(key, group)
  }

  return (
    <div className="flex flex-col gap-4">
      {showForm ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Add Result</p>

          {isSponsor && (
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)]"
            >
              {attendees.map((a) => {
                const user = userMap.get(a.userId)
                return (
                  <option key={a.userId} value={a.userId}>
                    {user?.name ?? a.userId}
                  </option>
                )
              })}
            </select>
          )}

          <div className="relative">
            <input
              list="metric-suggestions"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              placeholder="Metric (e.g. fastest_speed)"
              className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
            <datalist id="metric-suggestions">
              {SKI_METRICS.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>

          <div className="flex gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Value"
              className="flex-1 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unit"
              className="w-24 bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
            />
          </div>

          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)]"
          />

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending || !metric.trim() || !value.trim()}
              className="px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
            >
              {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
        >
          <Plus size={13} /> Add result
        </button>
      )}

      {activityList.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)] text-center py-4">No results yet.</p>
      ) : (
        Array.from(byDay.entries()).map(([dayKey, results]: [string, ActivityResult[]]) => (
          <div key={dayKey} className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">{dayKey}</p>
            {results.map((r) => {
              const user = userMap.get(r.userId)
              return (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                  <div>
                    <p className="text-sm text-[var(--fg)]">{r.metric.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-[var(--fg-muted)]">{user?.name?.split(' ')[0] ?? 'Unknown'}</p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--fg)]">
                    {r.value}{r.unit ? ` ${r.unit}` : ''}
                  </p>
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

function ExpensesTab({
  event,
  expenseList,
  attendees,
  attendeeUsers,
  currentUserId,
  ritualSlug,
}: {
  event: Event
  expenseList: Expense[]
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  currentUserId: string
  ritualSlug: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [description, setDescription] = useState('')
  const [dollarAmount, setDollarAmount] = useState('')
  const [adding, startAdd] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const userMap = new Map(attendeeUsers.map((u) => [u.id, u]))
  const attendeeIds = attendees.map((a) => a.userId)

  const totalCents = expenseList.reduce((s, e) => s + e.amount, 0)
  const perPersonCents = attendeeIds.length > 0 ? Math.round(totalCents / attendeeIds.length) : 0
  const net = computeNetPerPerson(expenseList, attendeeIds)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const amountCents = Math.round(parseFloat(dollarAmount) * 100)
    if (!description.trim() || isNaN(amountCents) || amountCents <= 0) return
    startAdd(async () => {
      await addExpense(event.id, ritualSlug, event.year, description, amountCents)
      setDescription('')
      setDollarAmount('')
      setShowForm(false)
    })
  }

  function handleDelete(expenseId: string) {
    setDeletingId(expenseId)
    startDelete(async () => {
      await deleteExpense(expenseId, ritualSlug, event.year)
      setDeletingId(null)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {showForm ? (
        <form onSubmit={handleAdd} className="flex flex-col gap-3 p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Add Expense</p>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
          />
          <input
            type="number"
            value={dollarAmount}
            onChange={(e) => setDollarAmount(e.target.value)}
            placeholder="Amount ($)"
            min="0"
            step="0.01"
            className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
          />
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={adding || !description.trim() || !dollarAmount}
              className="px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
            >
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
        >
          <Plus size={13} /> Add expense
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
            return (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm text-[var(--fg)]">{e.description}</p>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {payer?.name?.split(' ')[0] ?? 'Unknown'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-[var(--fg)]">
                    ${(e.amount / 100).toFixed(2)}
                  </p>
                  {isOwn && (
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={deleting && deletingId === e.id}
                      className="p-1 text-[var(--fg-muted)] hover:text-red-400 transition-colors disabled:opacity-50"
                      aria-label="Delete expense"
                    >
                      {deleting && deletingId === e.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Total + split */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--fg)]">Total</p>
              <p className="text-sm font-semibold text-[var(--fg)]">${(totalCents / 100).toFixed(2)}</p>
            </div>
            {attendeeIds.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--fg-muted)]">Per person ({attendeeIds.length})</p>
                <p className="text-xs text-[var(--fg-muted)]">${(perPersonCents / 100).toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Net per person */}
          <div className="flex flex-col gap-1 pt-1">
            <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Net</p>
            {Array.from(net.entries()).map(([uid, netCents]) => {
              const user = userMap.get(uid)
              return (
                <div key={uid} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--fg)]">{user?.name?.split(' ')[0] ?? 'Unknown'}</span>
                  <span className={netCents >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                    {netCents >= 0 ? '+' : ''}{(netCents / 100).toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main In Progress View ────────────────────────────────────────────────────

export function InProgressView({
  event,
  attendees,
  attendeeUsers,
  myAttendee,
  expenseList,
  loreList,
  activityList,
  awardDefs,
  currentAwards,
  awardVoteList,
  currentUserId,
  isSponsor,
  ritualSlug,
}: {
  event: Event
  attendees: Attendee[]
  attendeeUsers: AttendeeUser[]
  myAttendee: Attendee | null
  expenseList: Expense[]
  loreList: LoreEntry[]
  activityList: ActivityResult[]
  awardDefs: AwardDef[]
  currentAwards: Award[]
  awardVoteList: AwardVote[]
  currentUserId: string
  isSponsor: boolean
  ritualSlug: string
}) {
  const [activeTab, setActiveTab] = useState<'lore' | 'stats' | 'expenses'>('lore')
  const [showCloseout, setShowCloseout] = useState(false)

  const tabs = [
    { id: 'lore', label: 'Lore' },
    { id: 'stats', label: 'Stats' },
    { id: 'expenses', label: 'Expenses' },
  ] as const

  return (
    <div className="flex flex-col gap-6">
      {/* Awards Podium */}
      <AwardsPodium
        event={event}
        attendees={attendees}
        attendeeUsers={attendeeUsers}
        awardDefs={awardDefs}
        currentAwards={currentAwards}
        isSponsor={isSponsor}
        ritualSlug={ritualSlug}
      />

      {/* Tab switcher */}
      <div className="flex border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-[var(--accent)] text-[var(--fg)]'
                : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'lore' && (
        <LoreTab
          event={event}
          loreList={loreList}
          attendeeUsers={attendeeUsers}
          currentUserId={currentUserId}
          isSponsor={isSponsor}
          ritualSlug={ritualSlug}
        />
      )}
      {activeTab === 'stats' && (
        <StatsTab
          event={event}
          activityList={activityList}
          attendees={attendees}
          attendeeUsers={attendeeUsers}
          currentUserId={currentUserId}
          isSponsor={isSponsor}
          ritualSlug={ritualSlug}
        />
      )}
      {activeTab === 'expenses' && (
        <ExpensesTab
          event={event}
          expenseList={expenseList}
          attendees={attendees}
          attendeeUsers={attendeeUsers}
          currentUserId={currentUserId}
          ritualSlug={ritualSlug}
        />
      )}

      {/* Close Out button (sponsor only) */}
      {isSponsor && (
        <button
          onClick={() => setShowCloseout(true)}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border border-[var(--border)] text-base font-semibold text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
        >
          Close Out
        </button>
      )}

      {/* Closeout overlay */}
      {showCloseout && (
        <CloseoutView
          event={event}
          attendees={attendees}
          attendeeUsers={attendeeUsers}
          expenseList={expenseList}
          awardDefs={awardDefs}
          currentAwards={currentAwards}
          awardVoteList={awardVoteList}
          currentUserId={currentUserId}
          isSponsor={isSponsor}
          ritualSlug={ritualSlug}
          onBack={() => setShowCloseout(false)}
        />
      )}
    </div>
  )
}
