import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
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
      />
    </div>
  )
}
