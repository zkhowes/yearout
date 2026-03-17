import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { ritualAwardDefinitions } from '@/db/schema'
import { events, eventAwardLinks, awards } from '@/db/schema/events'
import { eq, inArray } from 'drizzle-orm'
import { getRitual, getMembership } from '@/lib/ritual-data'
import { SettingsForm } from './form'

export default async function SettingsPage({
  params,
}: {
  params: { ritualSlug: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ritual = await getRitual(params.ritualSlug)
  if (!ritual) redirect('/')

  const member = await getMembership(ritual.id, session.user.id!)
  if (!member || member.role !== 'sponsor') redirect(`/${params.ritualSlug}`)

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://yearout.zkhowes.fun').trim()

  // Load award definitions, events, and links
  const [awardDefs, ritualEvents, awardLinks] = await Promise.all([
    db.select().from(ritualAwardDefinitions).where(eq(ritualAwardDefinitions.ritualId, ritual.id)),
    db.select({ id: events.id, name: events.name, year: events.year, status: events.status })
      .from(events).where(eq(events.ritualId, ritual.id)),
    db.select().from(eventAwardLinks)
      .where(inArray(
        eventAwardLinks.awardDefinitionId,
        db.select({ id: ritualAwardDefinitions.id }).from(ritualAwardDefinitions).where(eq(ritualAwardDefinitions.ritualId, ritual.id))
      )),
  ])

  // Check which award defs have finalized winners
  const awardDefIds = awardDefs.map((d) => d.id)
  const finalizedAwards = awardDefIds.length > 0
    ? await db.select({ awardDefinitionId: awards.awardDefinitionId }).from(awards).where(inArray(awards.awardDefinitionId, awardDefIds))
    : []
  const awardDefsWithWinners = new Set(finalizedAwards.map((a) => a.awardDefinitionId))

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${params.ritualSlug}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        Back
      </Link>
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Settings</p>
        <h2 className="text-2xl font-bold text-[var(--fg)] mt-0.5">Edit Ritual</h2>
      </div>
      <SettingsForm
        ritual={{
          id: ritual.id,
          name: ritual.name,
          tagline: ritual.tagline,
          theme: ritual.theme,
          activityType: ritual.activityType,
          foundingYear: ritual.foundingYear,
          bylaws: ritual.bylaws,
          description: ritual.description,
          logoUrl: ritual.logoUrl,
          inviteToken: ritual.inviteToken,
          slug: ritual.slug,
        }}
        appUrl={appUrl}
        awardDefs={awardDefs.map((d) => ({
          id: d.id,
          name: d.name,
          label: d.label,
          type: d.type,
          hasWinners: awardDefsWithWinners.has(d.id),
        }))}
        ritualEvents={ritualEvents.map((e) => ({
          id: e.id,
          name: e.name,
          year: e.year,
          status: e.status,
        }))}
        awardLinks={awardLinks.map((l) => ({
          awardDefinitionId: l.awardDefinitionId,
          eventId: l.eventId,
        }))}
      />
    </div>
  )
}
