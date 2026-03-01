import { db } from '@/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { ritualMembers } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { SettingsForm } from './form'

export default async function SettingsPage({
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

  const [member] = await db
    .select()
    .from(ritualMembers)
    .where(
      and(
        eq(ritualMembers.ritualId, ritual.id),
        eq(ritualMembers.userId, session.user.id!)
      )
    )
    .limit(1)

  if (!member || member.role !== 'sponsor') redirect(`/${params.ritualSlug}`)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yearout.zkhowes.fun'

  return (
    <div className="flex flex-col gap-6">
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
          logoUrl: ritual.logoUrl,
          inviteToken: ritual.inviteToken,
          slug: ritual.slug,
        }}
        appUrl={appUrl}
      />
    </div>
  )
}
