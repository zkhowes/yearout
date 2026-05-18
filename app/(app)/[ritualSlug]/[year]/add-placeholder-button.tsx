'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { addPlaceholderCrew } from '@/lib/placeholder-actions'
import { sendInviteEmail } from '../settings/invite-actions'

export function AddPlaceholderButton({
  ritualId,
  eventId,
}: {
  ritualId: string
  eventId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [sendInvite, setSendInvite] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function add() {
    setError(null)
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    startTransition(async () => {
      try {
        const result = await addPlaceholderCrew(ritualId, {
          name: name.trim(),
          email: email.trim() || undefined,
          eventId,
        })
        if (sendInvite && result.hasRealEmail) {
          try {
            await sendInviteEmail(result.memberId)
          } catch (e) {
            console.error(e)
          }
        }
        setName('')
        setEmail('')
        setOpen(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add placeholder')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs flex items-center gap-1 text-[var(--accent)] hover:underline self-start"
      >
        <Plus size={12} /> Add someone
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
      <input
        autoFocus
        placeholder="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--surface)] text-sm"
      />
      <input
        type="email"
        placeholder="Email (optional — sends the Invite)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--surface)] text-sm"
      />
      {email.trim() ? (
        <label className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
          <input
            type="checkbox"
            checked={sendInvite}
            onChange={(e) => setSendInvite(e.target.checked)}
          />
          Send the Invite Call now
        </label>
      ) : null}
      <div className="flex items-center gap-2">
        <button
          onClick={add}
          disabled={pending || !name.trim()}
          className="flex-1 py-2 rounded btn-accent text-sm disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin inline" /> : 'Add to roster'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] px-3"
        >
          Cancel
        </button>
      </div>
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  )
}
