import { db } from '@/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { auth } from '@/auth'
import {
  ritualMembers,
  eventAttendees,
  events,
  expenses,
  expenseSplits,
  users,
} from '@/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { SkaldSpeaks } from '@/components/skald/skald-speaks'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function ReadOnlyRitualView({
  params,
}: {
  params: { token: string }
}) {
  const ritual = await db.query.rituals.findFirst({
    where: (r, { eq: e }) => e(r.readOnlyToken, params.token),
  })
  if (!ritual) notFound()

  // Crew (with placeholder marker)
  const members = await db
    .select({
      memberId: ritualMembers.id,
      userId: ritualMembers.userId,
      role: ritualMembers.role,
      isCoreCrewe: ritualMembers.isCoreCrewe,
      isPlaceholder: ritualMembers.isPlaceholder,
      nicknameOverride: ritualMembers.nicknameOverride,
      nationalityOverride: ritualMembers.nationalityOverride,
      customFlagSvg: ritualMembers.customFlagSvg,
      userName: users.name,
      userImage: users.image,
      nationality: users.nationality,
    })
    .from(ritualMembers)
    .innerJoin(users, eq(ritualMembers.userId, users.id))
    .where(eq(ritualMembers.ritualId, ritual.id))

  // Most recent upcoming / in-progress event for the flight board
  const upcoming = await db.query.events.findFirst({
    where: and(
      eq(events.ritualId, ritual.id),
      inArray(events.status, ['scheduled', 'in_progress']),
    ),
    orderBy: (e, { desc: d }) => [d(e.year)],
  })

  let flights: {
    userId: string
    name: string | null
    arrivalAirline: string | null
    arrivalFlightNumber: string | null
    arrivalDatetime: Date | null
    departureAirline: string | null
    departureFlightNumber: string | null
    departureDatetime: Date | null
    bookingStatus: string
  }[] = []
  if (upcoming) {
    flights = await db
      .select({
        userId: eventAttendees.userId,
        name: users.name,
        arrivalAirline: eventAttendees.arrivalAirline,
        arrivalFlightNumber: eventAttendees.arrivalFlightNumber,
        arrivalDatetime: eventAttendees.arrivalDatetime,
        departureAirline: eventAttendees.departureAirline,
        departureFlightNumber: eventAttendees.departureFlightNumber,
        departureDatetime: eventAttendees.departureDatetime,
        bookingStatus: eventAttendees.bookingStatus,
      })
      .from(eventAttendees)
      .innerJoin(users, eq(eventAttendees.userId, users.id))
      .where(eq(eventAttendees.eventId, upcoming.id))
  }

  // Expense ledger — net per user across all events of this ritual
  const allEvents = await db
    .select({ id: events.id, year: events.year, name: events.name })
    .from(events)
    .where(eq(events.ritualId, ritual.id))
  const eventIds = allEvents.map((e) => e.id)

  const ledger = new Map<string, { paid: number; owes: number; name: string | null }>()
  for (const m of members) {
    ledger.set(m.userId, { paid: 0, owes: 0, name: m.userName ?? m.nicknameOverride ?? '—' })
  }
  if (eventIds.length > 0) {
    const allExpenses = await db
      .select({ id: expenses.id, paidBy: expenses.paidBy, amount: expenses.amount })
      .from(expenses)
      .where(inArray(expenses.eventId, eventIds))
    for (const ex of allExpenses) {
      const cur = ledger.get(ex.paidBy)
      if (cur) cur.paid += ex.amount
    }
    const expenseIds = allExpenses.map((e) => e.id)
    if (expenseIds.length > 0) {
      const splits = await db
        .select({ userId: expenseSplits.userId, amount: expenseSplits.amount })
        .from(expenseSplits)
        .where(inArray(expenseSplits.expenseId, expenseIds))
      for (const s of splits) {
        const cur = ledger.get(s.userId)
        if (cur) cur.owes += s.amount
      }
    }
  }

  const session = await auth()
  const claimUrl = `/view/${params.token}/claim`
  const signInHref = session?.user?.id ? claimUrl : `/login?next=${encodeURIComponent(claimUrl)}`

  return (
    <div data-theme={ritual.theme} className="min-h-dvh bg-[var(--bg)] text-[var(--fg)]">
      <div className="max-w-2xl mx-auto px-4 pt-10 pb-16 flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col items-center gap-3 text-center">
          {ritual.logoUrl ? (
            <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
              <Image
                src={ritual.logoUrl}
                alt={ritual.name}
                width={80}
                height={80}
                className="w-full h-full object-contain"
              />
            </div>
          ) : null}
          <h1 className="text-3xl font-bold">{ritual.name}</h1>
          {ritual.tagline ? (
            <p className="italic text-[var(--fg-muted)]">&ldquo;{ritual.tagline}&rdquo;</p>
          ) : null}
          <p className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
            Shared view · read only
          </p>
        </header>

        {/* Skald welcome */}
        <SkaldSpeaks tone="oration">
          You stand at the edge of someone else&apos;s saga. Look — then decide if you belong here.
        </SkaldSpeaks>

        <div className="text-center">
          <Link
            href={signInHref}
            className="inline-block px-5 py-3 rounded-xl btn-accent text-sm font-semibold"
          >
            Joining us? Step in →
          </Link>
        </div>

        {/* Roster */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">Crew</h2>
          <ul className="flex flex-col gap-2">
            {members.map((m) => (
              <li
                key={m.memberId}
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-[var(--bg)] flex items-center justify-center text-sm">
                  {m.userImage ? (
                    <Image src={m.userImage} alt="" width={36} height={36} className="w-full h-full object-cover" />
                  ) : (
                    <span>{(m.userName ?? '?').slice(0, 1)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {m.nicknameOverride || m.userName || '—'}
                    {m.isCoreCrewe ? <span className="ml-2 text-xs text-[var(--accent)]">★</span> : null}
                  </div>
                  <div className="text-xs text-[var(--fg-muted)] truncate">
                    {m.role === 'sponsor' ? 'Sponsor' : m.isPlaceholder ? 'Placeholder · added by sponsor' : 'Crew'}
                    {m.nationalityOverride ?? m.nationality ? ` · ${m.nationalityOverride ?? m.nationality}` : ''}
                  </div>
                </div>
                {m.isPlaceholder ? (
                  <Link
                    href={`${signInHref}${signInHref.includes('?') ? '&' : '?'}claim=${m.memberId}`}
                    className="text-xs underline text-[var(--accent)] whitespace-nowrap"
                  >
                    Is this you?
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* Flight board (only when an upcoming event exists) */}
        {upcoming && flights.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
              Flight board · {upcoming.name}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--fg-muted)]">
                    <th className="py-2 pr-3">Crew</th>
                    <th className="py-2 pr-3">Arrival</th>
                    <th className="py-2 pr-3">Departure</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {flights.map((f) => (
                    <tr key={f.userId} className="border-t border-[var(--border)]">
                      <td className="py-2 pr-3">{f.name ?? '—'}</td>
                      <td className="py-2 pr-3 text-xs">
                        {f.arrivalAirline && f.arrivalFlightNumber
                          ? `${f.arrivalAirline} ${f.arrivalFlightNumber}`
                          : '—'}
                        {f.arrivalDatetime ? (
                          <div className="text-[var(--fg-muted)]">
                            {f.arrivalDatetime.toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {f.departureAirline && f.departureFlightNumber
                          ? `${f.departureAirline} ${f.departureFlightNumber}`
                          : '—'}
                        {f.departureDatetime ? (
                          <div className="text-[var(--fg-muted)]">
                            {f.departureDatetime.toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-xs">{f.bookingStatus.replace(/_/g, ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* Expense ledger */}
        {Array.from(ledger.values()).some((l) => l.paid > 0 || l.owes > 0) ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs uppercase tracking-widest text-[var(--fg-muted)]">
              Expense ledger · all events
            </h2>
            <ul className="flex flex-col gap-1">
              {Array.from(ledger.entries()).map(([uid, l]) => {
                const net = l.paid - l.owes
                return (
                  <li
                    key={uid}
                    className="flex justify-between items-center py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
                  >
                    <span className="text-sm">{l.name}</span>
                    <span
                      className={`text-sm font-mono ${
                        net > 0 ? 'text-emerald-500' : net < 0 ? 'text-rose-500' : 'text-[var(--fg-muted)]'
                      }`}
                    >
                      {net > 0 ? '+' : ''}${(net / 100).toFixed(0)}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="text-xs text-[var(--fg-muted)] italic">
              Positive = owed back. Negative = owes the pot.
            </p>
          </section>
        ) : null}

        <footer className="text-center text-xs text-[var(--fg-muted)] mt-8">
          <span className="uppercase tracking-widest">Yearout</span>
        </footer>
      </div>
    </div>
  )
}
