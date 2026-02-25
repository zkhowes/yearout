import { db } from '@/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { joinRitual } from '@/lib/ritual-actions'

const ACTIVITY_LABELS: Record<string, string> = {
  ski: '⛷️  Ski / Snow',
  golf: '⛳  Golf',
  mountain_biking: '🚵  Mountain Biking',
  fishing: '🎣  Fishing',
  backpacking: '🎒  Backpacking',
  family: '🏡  Family',
  girls_trip: '✨  Girls Trip',
  other: '🧭  Other',
}

export default async function JoinPage({
  params,
}: {
  params: { token: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq }) => eq(r.inviteToken, params.token),
  })

  if (!ritual) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--bg)]">
        <div className="text-center px-4">
          <p className="text-2xl mb-2">🔗</p>
          <p className="text-[var(--fg)] font-semibold">Invalid invite link</p>
          <p className="text-sm text-[var(--fg-muted)] mt-1">
            This link may have expired or been revoked.
          </p>
        </div>
      </div>
    )
  }

  // Already a member — go straight to the ritual
  const existing = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(eq(rm.ritualId, ritual.id), eq(rm.userId, session.user!.id!)),
  })
  if (existing) redirect(`/${ritual.slug}`)

  const join = joinRitual.bind(null, params.token)

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg)]">
      {/* Minimal header */}
      <header className="px-5 py-4 border-b border-[var(--border)]">
        <span className="font-bold tracking-wide text-[var(--fg)]">Yearout</span>
      </header>

      {/* Invite card */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
            You&apos;re invited to join
          </p>
          <h1 className="text-4xl font-bold text-[var(--fg)]">{ritual.name}</h1>
          {ritual.tagline && (
            <p className="text-lg text-[var(--fg-muted)] italic">&ldquo;{ritual.tagline}&rdquo;</p>
          )}
        </div>

        <span className="px-4 py-2 rounded-full border border-[var(--border)] text-sm text-[var(--fg-muted)]">
          {ACTIVITY_LABELS[ritual.activityType] ?? ritual.activityType}
        </span>

        <form action={join} className="w-full max-w-xs flex flex-col gap-3">
          <button
            type="submit"
            className="w-full py-4 rounded-xl btn-accent text-base font-semibold"
          >
            Join {ritual.name}
          </button>
          <a
            href="/"
            className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
          >
            Not now
          </a>
        </form>
      </div>
    </div>
  )
}
