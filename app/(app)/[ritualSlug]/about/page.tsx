import { db } from '@/db'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { ritualMembers, eventAttendees, events, users } from '@/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'

export default async function AboutPage({
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

  // Fetch all ritual members with user data
  const members = await db
    .select({
      userId: ritualMembers.userId,
      role: ritualMembers.role,
      isCoreCrewe: ritualMembers.isCoreCrewe,
      nicknameOverride: ritualMembers.nicknameOverride,
      photoOverride: ritualMembers.photoOverride,
      userName: users.name,
      userImage: users.image,
    })
    .from(ritualMembers)
    .innerJoin(users, eq(ritualMembers.userId, users.id))
    .where(eq(ritualMembers.ritualId, ritual.id))

  // Get all event IDs for this ritual
  const ritualEvents = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.ritualId, ritual.id))
  const eventIds = ritualEvents.map((e) => e.id)

  // Count attendance per user across all events
  const attendanceCounts = new Map<string, number>()
  if (eventIds.length > 0) {
    const counts = await db
      .select({
        userId: eventAttendees.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(eventAttendees)
      .where(
        and(
          inArray(eventAttendees.eventId, eventIds),
          sql`${eventAttendees.bookingStatus} != 'out'`
        )
      )
      .groupBy(eventAttendees.userId)

    for (const row of counts) {
      attendanceCounts.set(row.userId, row.count)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Founding Year */}
      {ritual.foundingYear && (
        <p className="text-center text-xs uppercase tracking-widest text-[var(--fg-muted)]">
          Est. {ritual.foundingYear}
        </p>
      )}

      {/* Description */}
      {ritual.description && (
        <div className="flex flex-col gap-3">
          {ritual.description.split('\n\n').map((paragraph, i) => (
            <p key={i} className="text-sm text-[var(--fg)] leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {/* The Crew */}
      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">The Crew</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {[...members].sort((a, b) => (attendanceCounts.get(b.userId) ?? 0) - (attendanceCounts.get(a.userId) ?? 0)).map((member) => {
            const photoUrl = member.photoOverride ?? member.userImage
            const displayName = member.nicknameOverride ?? member.userName?.split(' ')[0] ?? 'Unknown'
            const count = attendanceCounts.get(member.userId) ?? 0

            return (
              <div
                key={member.userId}
                className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
              >
                {/* Attendance badge */}
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {count}
                  </span>
                )}
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--border)] flex items-center justify-center">
                    <span className="text-sm font-semibold text-[var(--fg-muted)]">
                      {(displayName).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-xs font-medium text-[var(--fg)] text-center leading-tight max-w-[72px] truncate">
                  {displayName}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      {/* Bylaws */}
      {ritual.bylaws && (
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Bylaws</p>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-sm text-[var(--fg)] leading-relaxed whitespace-pre-line">{ritual.bylaws}</p>
          </div>
        </div>
      )}
    </div>
  )
}
