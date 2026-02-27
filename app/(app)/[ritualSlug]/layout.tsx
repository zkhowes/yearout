import Link from 'next/link'
import { Settings } from 'lucide-react'
import { db } from '@/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { ritualMembers } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
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

  if (!member) redirect('/')

  return (
    <div data-theme={ritual.theme} className="min-h-dvh bg-[var(--bg)] text-[var(--fg)]" style={{ paddingTop: 'var(--header-height)' }}>
      <div className="max-w-2xl mx-auto px-4 flex flex-col gap-6 pb-10">
      {/* Ritual identity */}
      <div className="relative flex flex-col items-center text-center pt-6 gap-2">
        <div className="w-16 h-16 rounded-full bg-[var(--accent)] opacity-20 mb-1" />
        <h1 className="text-3xl font-bold text-[var(--fg)]">{ritual.name}</h1>
        {ritual.tagline && (
          <p className="text-sm text-[var(--fg-muted)] italic">{ritual.tagline}</p>
        )}
        {member.role === 'sponsor' && (
          <Link
            href={`/${ritual.slug}/settings`}
            className="absolute top-4 right-0 p-2 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
            aria-label="Ritual settings"
          >
            <Settings size={18} />
          </Link>
        )}
      </div>

      {/* Tab bar */}
      <TabBar ritualSlug={ritual.slug} />

      {/* Page content */}
      {children}
      </div>
    </div>
  )
}
