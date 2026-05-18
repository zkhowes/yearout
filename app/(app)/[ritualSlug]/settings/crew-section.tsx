'use client'

import { useState, useTransition } from 'react'
import { Check, Copy, RefreshCw, Plus, Trash2, Loader2, Send } from 'lucide-react'
import {
  addPlaceholderCrew,
  removePlaceholderCrew,
  generateReadOnlyLink,
  rotateReadOnlyLink,
} from '@/lib/placeholder-actions'
import { sendInviteEmail } from './invite-actions'

type Placeholder = {
  memberId: string
  userId: string
  name: string | null
  nickname: string | null
  hasRealEmail: boolean
  email: string
}

export function CrewSection({
  ritualId,
  appUrl,
  initialReadOnlyToken,
  placeholders: initialPlaceholders,
}: {
  ritualId: string
  ritualSlug: string
  appUrl: string
  initialReadOnlyToken: string | null
  placeholders: Placeholder[]
}) {
  const [token, setToken] = useState<string | null>(initialReadOnlyToken)
  const [placeholders, setPlaceholders] = useState<Placeholder[]>(initialPlaceholders)
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  // Add-placeholder form state
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [nationality, setNationality] = useState('')
  const [email, setEmail] = useState('')
  const [sendInvite, setSendInvite] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const shareLink = token ? `${appUrl}/view/${token}` : null

  function generateOrCopyShare() {
    setStatus(null)
    setError(null)
    if (!token) {
      startTransition(async () => {
        const t = await generateReadOnlyLink(ritualId)
        setToken(t)
        await navigator.clipboard.writeText(`${appUrl}/view/${t}`).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
    } else if (shareLink) {
      navigator.clipboard.writeText(shareLink).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  function rotate() {
    if (!confirm('Rotating the link invalidates the current share URL. Anyone with the old link will see a 404. Continue?')) return
    startTransition(async () => {
      const t = await rotateReadOnlyLink(ritualId)
      setToken(t)
    })
  }

  function add() {
    setError(null)
    setStatus(null)
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    startTransition(async () => {
      try {
        const result = await addPlaceholderCrew(ritualId, {
          name: name.trim(),
          nickname: nickname.trim() || undefined,
          nationality: nationality.trim() || undefined,
          email: email.trim() || undefined,
        })
        setPlaceholders((curr) => [
          ...curr,
          {
            memberId: result.memberId,
            userId: result.stubUserId,
            name: name.trim(),
            nickname: nickname.trim() || null,
            hasRealEmail: result.hasRealEmail,
            email: email.trim() || '',
          },
        ])
        // Optionally fire the Invite call
        if (sendInvite && result.hasRealEmail) {
          try {
            await sendInviteEmail(result.memberId)
            setStatus(`Added ${name.trim()} and sent the Invite to ${email.trim()}.`)
          } catch (e) {
            setStatus(`Added ${name.trim()} but the Invite email failed: ${e instanceof Error ? e.message : 'unknown error'}`)
          }
        } else {
          setStatus(`Added ${name.trim()} to the roster.`)
        }
        setName('')
        setNickname('')
        setNationality('')
        setEmail('')
        setOpen(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add placeholder')
      }
    })
  }

  function remove(memberId: string, who: string) {
    if (!confirm(`Remove ${who} from the roster? Their flight info, expenses, and any data tied to them will be deleted.`)) return
    startTransition(async () => {
      await removePlaceholderCrew(memberId)
      setPlaceholders((curr) => curr.filter((p) => p.memberId !== memberId))
    })
  }

  function resendInvite(memberId: string, who: string) {
    setStatus(null)
    startTransition(async () => {
      try {
        await sendInviteEmail(memberId)
        setStatus(`Invite sent to ${who}.`)
      } catch (e) {
        setStatus(`Invite to ${who} failed: ${e instanceof Error ? e.message : 'unknown error'}`)
      }
    })
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Crew</h2>

      {/* Read-only share link */}
      <div className="flex flex-col gap-2">
        <button
          onClick={generateOrCopyShare}
          disabled={pending}
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm hover:bg-[var(--border)] transition-colors disabled:opacity-50"
        >
          <span className="truncate text-left text-xs font-mono">
            {shareLink ?? 'Generate a read-only share link…'}
          </span>
          {copied ? (
            <Check size={14} className="shrink-0 text-green-500" />
          ) : (
            <Copy size={14} className="shrink-0 text-[var(--fg-muted)]" />
          )}
        </button>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--fg-muted)]">
            Anyone with this link can view the roster, flights, and expense ledger. No sign-in required.
          </p>
          {token ? (
            <button
              onClick={rotate}
              disabled={pending}
              className="text-xs flex items-center gap-1 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors whitespace-nowrap"
            >
              <RefreshCw size={12} /> Rotate
            </button>
          ) : null}
        </div>
      </div>

      {/* Placeholders */}
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--fg-muted)]">
            Placeholders ({placeholders.length})
          </p>
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-xs flex items-center gap-1 text-[var(--accent)] hover:underline"
          >
            <Plus size={12} /> Add someone
          </button>
        </div>

        {open ? (
          <div className="flex flex-col gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <input
              autoFocus
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)] text-sm"
            />
            <input
              placeholder="Nickname (optional)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)] text-sm"
            />
            <input
              placeholder="Nationality (optional)"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)] text-sm"
            />
            <input
              type="email"
              placeholder="Email (optional — sends the Invite if provided)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)] text-sm"
            />
            {email.trim() ? (
              <label className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                <input
                  type="checkbox"
                  checked={sendInvite}
                  onChange={(e) => setSendInvite(e.target.checked)}
                />
                Send the Invite Call email now
              </label>
            ) : null}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={add}
                disabled={pending || !name.trim()}
                className="flex-1 py-2 rounded btn-accent text-sm disabled:opacity-50"
              >
                {pending ? <Loader2 size={14} className="animate-spin inline" /> : 'Add'}
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
        ) : null}

        {placeholders.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {placeholders.map((p) => (
              <li
                key={p.memberId}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
              >
                <div className="min-w-0">
                  <div className="text-sm truncate">
                    {p.name ?? '—'}
                    {p.nickname ? <span className="text-[var(--fg-muted)]"> · {p.nickname}</span> : null}
                  </div>
                  {p.hasRealEmail ? (
                    <div className="text-xs text-[var(--fg-muted)] truncate">{p.email}</div>
                  ) : (
                    <div className="text-xs text-[var(--fg-muted)] italic">no email · share-link only</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.hasRealEmail ? (
                    <button
                      onClick={() => resendInvite(p.memberId, p.name ?? p.email)}
                      disabled={pending}
                      className="text-xs flex items-center gap-1 text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
                      title="Send the Invite Call"
                    >
                      <Send size={12} />
                    </button>
                  ) : null}
                  <button
                    onClick={() => remove(p.memberId, p.name ?? 'this placeholder')}
                    disabled={pending}
                    className="text-xs flex items-center gap-1 text-[var(--fg-muted)] hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {status ? <p className="text-xs text-[var(--fg-muted)]">{status}</p> : null}
      </div>

      <p className="text-xs text-[var(--fg-muted)] mt-1">
        Placeholders count on the roster, flights, and expenses. They can&apos;t write Lore until they claim their spot.
      </p>
    </section>
  )
}
