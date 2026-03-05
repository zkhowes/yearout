import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getRitual, getMembership } from '@/lib/ritual-data'
import { RitualIdentity } from './ritual-identity'
import { TabBar } from './tab-bar'

export default async function RitualLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { ritualSlug: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ritual = await getRitual(params.ritualSlug)
  if (!ritual) redirect('/')

  const member = await getMembership(ritual.id, session.user.id!)
  if (!member) redirect('/')

  return (
    <div data-theme={ritual.theme} className="min-h-dvh bg-[var(--bg)] text-[var(--fg)]" style={{ paddingTop: 'var(--header-height)' }}>
      <div className="max-w-2xl mx-auto px-4 flex flex-col gap-6 pb-10">
      {/* Ritual identity (hidden on event pages) */}
      <RitualIdentity
        slug={ritual.slug}
        name={ritual.name}
        tagline={ritual.tagline}
        logoUrl={ritual.logoUrl}
        isSponsor={member.role === 'sponsor'}
      />

      {/* Tab bar */}
      <TabBar ritualSlug={ritual.slug} />

      {/* Page content */}
      {children}
      </div>
    </div>
  )
}
