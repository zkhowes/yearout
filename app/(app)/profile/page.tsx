import { auth } from '@/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { ProfileForm } from './form'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  })
  if (!user) redirect('/login')

  return (
    <div className="max-w-md mx-auto px-4 py-8" style={{ paddingTop: 'calc(var(--header-height) + 2rem)' }}>
      <h1 className="text-2xl font-bold text-[var(--fg)] mb-8">Profile</h1>
      <ProfileForm
        user={{
          name: user.name ?? '',
          image: user.image ?? '',
          nationality: user.nationality ?? '',
        }}
      />
    </div>
  )
}
