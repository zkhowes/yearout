'use server'

import { db } from '@/db'
import { users } from '@/db/schema'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function updateProfile(data: {
  name?: string
  image?: string
  nationality?: string
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await db
    .update(users)
    .set({
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.image !== undefined && { image: data.image }),
      ...(data.nationality !== undefined && { nationality: data.nationality.trim() }),
    })
    .where(eq(users.id, session.user.id))

  revalidatePath('/profile')
}
