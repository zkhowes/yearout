import { db } from '@/db'
import { auth } from '@/auth'

export type RitualAccess =
  | { kind: 'sponsor' | 'organizer' | 'crew_member'; userId: string; memberId: string; isPlaceholder: false }
  | { kind: 'read_only_link' }
  | { kind: 'none' }

export async function getRitualAccess(
  ritualId: string,
  opts?: { readOnlyToken?: string }
): Promise<RitualAccess> {
  const session = await auth()
  if (session?.user?.id) {
    const member = await db.query.ritualMembers.findFirst({
      where: (rm, { and, eq }) =>
        and(eq(rm.ritualId, ritualId), eq(rm.userId, session.user!.id!)),
    })
    if (member && !member.isPlaceholder) {
      return { kind: member.role, userId: session.user.id!, memberId: member.id, isPlaceholder: false }
    }
  }

  if (opts?.readOnlyToken) {
    const ritual = await db.query.rituals.findFirst({
      where: (r, { eq }) => eq(r.id, ritualId),
      columns: { readOnlyToken: true },
    })
    if (ritual?.readOnlyToken && ritual.readOnlyToken === opts.readOnlyToken) {
      return { kind: 'read_only_link' }
    }
  }

  return { kind: 'none' }
}

export function canEdit(access: RitualAccess): boolean {
  return access.kind === 'sponsor' || access.kind === 'organizer' || access.kind === 'crew_member'
}

export function canSponsor(access: RitualAccess): boolean {
  return access.kind === 'sponsor'
}
