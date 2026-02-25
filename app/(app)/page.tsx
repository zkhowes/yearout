import Link from 'next/link'
import { db } from '@/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { rituals, ritualMembers } from '@/db/schema'
import { eq } from 'drizzle-orm'

const ACTIVITY_EMOJI: Record<string, string> = {
  ski: '⛷️',
  golf: '⛳',
  mountain_biking: '🚵',
  fishing: '🎣',
  backpacking: '🎒',
  family: '🏡',
  girls_trip: '✨',
  other: '🧭',
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Fetch all rituals the user belongs to
  const memberships = await db
    .select({ ritual: rituals })
    .from(ritualMembers)
    .innerJoin(rituals, eq(ritualMembers.ritualId, rituals.id))
    .where(eq(ritualMembers.userId, session.user.id!))

  const userRituals = memberships.map((m) => m.ritual)

  // If only one ritual, go straight to it
  if (userRituals.length === 1) redirect(`/${userRituals[0].slug}`)

  if (userRituals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--fg)]">
            You&apos;re not part of any Rituals yet.
          </h2>
          <p className="mt-2 text-[var(--fg-muted)] text-sm">
            Want to create one? We&apos;ll help you get started.
          </p>
        </div>
        <Link
          href="/new"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg btn-accent text-sm font-semibold"
        >
          Create a Ritual
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <h1 className="text-xl font-bold text-[var(--fg)]">Your Rituals</h1>
      <div className="flex flex-col gap-3">
        {userRituals.map((ritual) => (
          <Link
            key={ritual.id}
            href={`/${ritual.slug}`}
            className="flex items-center gap-4 px-4 py-4 rounded-xl border border-[var(--border)] hover:border-[var(--fg-muted)] transition-colors bg-[var(--surface)]"
          >
            <span className="text-2xl">{ACTIVITY_EMOJI[ritual.activityType] ?? '🧭'}</span>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[var(--fg)] truncate">{ritual.name}</span>
              {ritual.tagline && (
                <span className="text-xs text-[var(--fg-muted)] truncate italic">{ritual.tagline}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
      <Link
        href="/new"
        className="text-sm text-center text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
      >
        + Create another Ritual
      </Link>
    </div>
  )
}
