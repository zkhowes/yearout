import { listDrafts, getRateMeter } from './actions'
import { TheCallClient } from './TheCallClient'
import { db } from '@/db'
import { rituals } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SponsorCallPage({
  params,
}: {
  params: Promise<{ ritualSlug: string }>
}) {
  const { ritualSlug } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ritual = await db.query.rituals.findFirst({
    where: eq(rituals.slug, ritualSlug),
  })
  if (!ritual) redirect('/')
  if (ritual.sponsorId !== session.user.id) redirect(`/${ritualSlug}`)

  const [drafts, meter] = await Promise.all([
    listDrafts(ritualSlug),
    getRateMeter(ritualSlug),
  ])

  return (
    <TheCallClient
      ritualSlug={ritualSlug}
      ritualName={ritual.name}
      drafts={drafts}
      meter={meter}
    />
  )
}
