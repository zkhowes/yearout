import { db } from '@/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { NewEventForm } from './form'

export default async function NewEventPage({
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

  // Only sponsors can create events
  const member = await db.query.ritualMembers.findFirst({
    where: (rm, { and, eq }) =>
      and(eq(rm.ritualId, ritual.id), eq(rm.userId, session.user!.id!)),
  })
  if (!member || member.role !== 'sponsor') redirect(`/${params.ritualSlug}`)

  return (
    <div className="min-h-[70vh] flex flex-col justify-center gap-8 px-2 py-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
          {ritual.name}
        </p>
        <h1 className="text-3xl font-bold text-[var(--fg)] mt-1">Plan an Event</h1>
      </div>

      <NewEventForm
        ritualId={ritual.id}
        ritualSlug={ritual.slug}
        ritualName={ritual.name}
      />
    </div>
  )
}
