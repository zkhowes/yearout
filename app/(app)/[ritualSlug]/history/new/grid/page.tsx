import { db } from '@/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { HistoryGrid } from '@/components/history/history-grid'
import { SkaldSpeaks } from '@/components/skald/skald-speaks'

export default async function HistoryGridPage(
  props: {
    params: Promise<{ ritualSlug: string }>
  }
) {
  const params = await props.params;
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
    <div className="max-w-4xl mx-auto px-4 min-h-[70vh] flex flex-col gap-8 py-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
          {ritual.name}
        </p>
        <h1 className="text-3xl font-bold text-[var(--fg)] mt-1">Backfill History</h1>
      </div>

      <SkaldSpeaks tone="brief">
        Year and location are required. Mountains and a memory are gifts. Paste from a sheet if you have one.
      </SkaldSpeaks>

      <HistoryGrid ritualId={ritual.id} ritualSlug={ritual.slug} />
    </div>
  )
}
