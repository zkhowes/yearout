'use client'

import { useState, useTransition } from 'react'
import { Check, X, Minus, Plus, Lock, Loader2, Trash2 } from 'lucide-react'
import { addProposal, castVote, lockProposal, deleteProposal } from '@/lib/event-actions'

type Vote = 'yes' | 'no' | 'maybe'

type Proposal = {
  id: string
  location: string | null
  dates: string | null
  notes: string | null
  votes: { userId: string; vote: string }[]
  myVote: string | null
}

function VoteBar({ votes }: { votes: Proposal['votes'] }) {
  const yes = votes.filter((v) => v.vote === 'yes').length
  const maybe = votes.filter((v) => v.vote === 'maybe').length
  const no = votes.filter((v) => v.vote === 'no').length
  const total = votes.length
  if (total === 0) return <span className="text-xs text-[var(--fg-muted)]">No votes yet</span>
  return (
    <div className="flex items-center gap-3 text-xs text-[var(--fg-muted)]">
      <span className="text-green-500 font-medium">✓ {yes}</span>
      <span className="text-yellow-500 font-medium">~ {maybe}</span>
      <span className="text-red-400 font-medium">✗ {no}</span>
    </div>
  )
}

function VoteButtons({
  proposalId,
  current,
  disabled,
}: {
  proposalId: string
  current: string | null
  disabled: boolean
}) {
  const [pending, startTransition] = useTransition()

  function vote(v: Vote) {
    startTransition(async () => {
      await castVote(proposalId, v)
    })
  }

  const btn = (v: Vote, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => vote(v)}
      disabled={disabled || pending}
      aria-label={label}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-40 ${
        current === v
          ? v === 'yes'
            ? 'bg-green-500 border-green-500 text-white'
            : v === 'maybe'
              ? 'bg-yellow-400 border-yellow-400 text-black'
              : 'bg-red-400 border-red-400 text-white'
          : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--fg-muted)]'
      }`}
    >
      {pending ? <Loader2 size={11} className="animate-spin" /> : icon}
      {label}
    </button>
  )

  return (
    <div className="flex gap-2">
      {btn('yes', <Check size={11} />, 'Yes')}
      {btn('maybe', <Minus size={11} />, 'Maybe')}
      {btn('no', <X size={11} />, 'No')}
    </div>
  )
}

// ─── Add Proposal Form ────────────────────────────────────────────────────────

function AddProposalForm({
  eventId,
  onDone,
}: {
  eventId: string
  onDone: () => void
}) {
  const [location, setLocation] = useState('')
  const [dates, setDates] = useState('')
  const [notes, setNotes] = useState('')
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!location.trim() && !dates.trim()) return
    startTransition(async () => {
      await addProposal(eventId, { location, dates, notes })
      onDone()
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
      <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">New Proposal</p>
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location (e.g. Breckenridge, CO)"
        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
      />
      <input
        value={dates}
        onChange={(e) => setDates(e.target.value)}
        placeholder="Dates (e.g. Feb 8–12)"
        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
      />
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--fg)] outline-none py-1 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]"
      />
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending || (!location.trim() && !dates.trim())}
          className="px-4 py-2 rounded-lg btn-accent text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Add
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

// ─── Main Proposals Component ─────────────────────────────────────────────────

export function Proposals({
  eventId,
  ritualSlug,
  proposals,
  isSponsor,
}: {
  eventId: string
  ritualSlug: string
  proposals: Proposal[]
  isSponsor: boolean
}) {
  const [showForm, setShowForm] = useState(false)
  const [lockingId, setLockingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleLock(proposalId: string) {
    setLockingId(proposalId)
    lockProposal(proposalId, ritualSlug)
  }

  function handleDelete(proposalId: string) {
    setDeletingId(proposalId)
    deleteProposal(proposalId).then(() => setDeletingId(null))
  }

  return (
    <div className="flex flex-col gap-4">

      {proposals.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-center">
          <p className="text-sm text-[var(--fg-muted)]">No proposals yet.</p>
        </div>
      )}

      {proposals.map((p) => (
        <div
          key={p.id}
          className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
        >
          {/* Location + dates */}
          <div className="flex flex-col gap-0.5">
            {p.location && (
              <p className="text-base font-semibold text-[var(--fg)]">{p.location}</p>
            )}
            {p.dates && (
              <p className="text-sm text-[var(--fg-muted)]">{p.dates}</p>
            )}
            {p.notes && (
              <p className="text-xs text-[var(--fg-muted)] italic mt-1">{p.notes}</p>
            )}
          </div>

          {/* Vote tally */}
          <VoteBar votes={p.votes} />

          {/* Actions row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <VoteButtons
              proposalId={p.id}
              current={p.myVote}
              disabled={false}
            />

            <div className="flex gap-2">
              {isSponsor && (
                <button
                  onClick={() => handleLock(p.id)}
                  disabled={lockingId === p.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {lockingId === p.id
                    ? <Loader2 size={11} className="animate-spin" />
                    : <Lock size={11} />}
                  Lock in
                </button>
              )}
              <button
                onClick={() => handleDelete(p.id)}
                disabled={deletingId === p.id}
                className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-red-400 transition-colors disabled:opacity-50"
                aria-label="Delete proposal"
              >
                {deletingId === p.id
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Trash2 size={13} />}
              </button>
            </div>
          </div>
        </div>
      ))}

      {showForm ? (
        <AddProposalForm
          eventId={eventId}
          onDone={() => setShowForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--fg-muted)] transition-colors"
        >
          <Plus size={13} /> Add proposal
        </button>
      )}
    </div>
  )
}
