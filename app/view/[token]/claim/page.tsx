import { db } from '@/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { ritualMembers, users } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { SkaldSpeaks } from '@/components/skald/skald-speaks'
import { claimAndRedirect, joinFreshFromShareLink } from './actions'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { claim?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/view/${params.token}/claim`)}`)
  }

  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq: e }) => e(r.readOnlyToken, params.token),
  })
  if (!ritual) notFound()

  // Already a real member? Drop them straight into the ritual.
  const myMembership = await db.query.ritualMembers.findFirst({
    where: (rm, { and: a, eq: e }) =>
      a(e(rm.ritualId, ritual.id), e(rm.userId, session.user!.id!)),
  })
  if (myMembership && !myMembership.isPlaceholder) {
    redirect(`/${ritual.slug}`)
  }

  // List placeholders for the picker
  const placeholders = await db
    .select({
      memberId: ritualMembers.id,
      userId: users.id,
      name: users.name,
      nickname: ritualMembers.nicknameOverride,
    })
    .from(ritualMembers)
    .innerJoin(users, eq(ritualMembers.userId, users.id))
    .where(and(eq(ritualMembers.ritualId, ritual.id), eq(ritualMembers.isPlaceholder, true)))

  const preselected = searchParams.claim
  const claim = claimAndRedirect.bind(null)
  const joinFresh = joinFreshFromShareLink.bind(null, params.token)

  return (
    <div data-theme={ritual.theme} className="min-h-dvh bg-[var(--bg)] text-[var(--fg)]">
      <div className="max-w-md mx-auto px-4 pt-12 pb-16 flex flex-col gap-8">
        <header className="flex flex-col items-center text-center gap-2">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
            Step into
          </p>
          <h1 className="text-3xl font-bold">{ritual.name}</h1>
        </header>

        <SkaldSpeaks tone="brief">
          Tell me which name on the roster belongs to you. Or write yourself in fresh.
        </SkaldSpeaks>

        {placeholders.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
              Already on the roster
            </h2>
            <ul className="flex flex-col gap-2">
              {placeholders.map((p) => (
                <li key={p.memberId}>
                  <form action={claim}>
                    <input type="hidden" name="memberId" value={p.memberId} />
                    <button
                      type="submit"
                      autoFocus={preselected === p.memberId}
                      className="w-full text-left p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors flex items-center justify-between"
                    >
                      <span>
                        <span className="text-base font-semibold">{p.name ?? '—'}</span>
                        {p.nickname ? (
                          <span className="ml-2 text-sm text-[var(--fg-muted)]">&ldquo;{p.nickname}&rdquo;</span>
                        ) : null}
                      </span>
                      <span className="text-sm text-[var(--accent)]">That&apos;s me →</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-sm italic text-[var(--fg-muted)] text-center">
            No placeholders on the roster — but you can still join fresh below.
          </p>
        )}

        <form action={joinFresh} className="flex flex-col gap-3 pt-2">
          <button
            type="submit"
            className="w-full py-3 rounded-xl border border-[var(--border)] hover:border-[var(--fg)] text-sm transition-colors"
          >
            None of these — I&apos;m new
          </button>
        </form>

        <div className="text-center">
          <Link href={`/view/${params.token}`} className="text-xs underline text-[var(--fg-muted)]">
            Back to the read-only view
          </Link>
        </div>
      </div>
    </div>
  )
}
