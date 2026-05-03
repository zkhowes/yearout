import Link from 'next/link'
import { db } from '@/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { SkaldSpeaks } from '@/components/skald/skald-speaks'

export default async function HistoryChooserPage({
  params,
}: {
  params: { ritualSlug: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq }) => eq(r.slug, params.ritualSlug),
  })
  if (!ritual) redirect('/')

  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(eq(rm.ritualId, ritual.id), eq(rm.userId, session.user!.id!)),
  })
  if (!member || member.role !== 'sponsor') redirect(`/${params.ritualSlug}`)

  return (
    <div className="max-w-2xl mx-auto px-4 min-h-[70vh] flex flex-col justify-center gap-10 py-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
          {ritual.name}
        </p>
        <h1 className="text-3xl font-bold text-[var(--fg)] mt-1">Backfill History</h1>
      </div>

      <SkaldSpeaks tone="oration">
        Years of this ritual exist already, even if no one has written them down.
        Bring them to me.
      </SkaldSpeaks>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href={`/${params.ritualSlug}/history/new/grid`}
          className="group flex flex-col gap-3 px-5 py-6 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--fg)] transition-colors"
        >
          <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
            I know the data
          </span>
          <span className="text-xl font-bold text-[var(--fg)]">Grid me up.</span>
          <span className="text-sm text-[var(--fg-muted)] leading-snug">
            Spreadsheet-style. Type fast, paste from a sheet, done in a minute.
          </span>
          <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--fg)] group-hover:translate-x-0.5 transition-transform">
            Open the grid <ArrowRight size={14} />
          </span>
        </Link>

        <Link
          href={`/${params.ritualSlug}/history/new/converse`}
          className="group flex flex-col gap-3 px-5 py-6 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--fg)] transition-colors"
        >
          <span className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
            Let&apos;s talk
          </span>
          <span className="text-xl font-bold text-[var(--fg)]">The Skald walks you back.</span>
          <span className="text-sm text-[var(--fg-muted)] leading-snug">
            Brain-dump what you remember. I will sort the years into chapters.
          </span>
          <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--fg)] group-hover:translate-x-0.5 transition-transform">
            Walk with the Skald <ArrowRight size={14} />
          </span>
        </Link>
      </div>
    </div>
  )
}
