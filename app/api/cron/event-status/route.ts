import { NextResponse } from 'next/server'
import { db } from '@/db'
import { events, callSchedule } from '@/db/schema'
import { eq, and, lte } from 'drizzle-orm'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Auto-start: scheduled → in_progress when startDate <= today
  const started = await db
    .update(events)
    .set({ status: 'in_progress' })
    .where(
      and(
        eq(events.status, 'scheduled'),
        lte(events.startDate, today)
      )
    )
    .returning({ id: events.id, name: events.name })

  // Auto-conclude: in_progress → concluded when endDate has passed
  const concluded = await db
    .update(events)
    .set({ status: 'concluded' })
    .where(
      and(
        eq(events.status, 'in_progress'),
        lte(events.endDate, today)
      )
    )
    .returning({ id: events.id, name: events.name, ritualId: events.ritualId })

  // Enqueue Stage 5 closeout draft for each freshly-concluded event
  for (const ev of concluded) {
    try {
      await db.insert(callSchedule).values({
        id: crypto.randomUUID(),
        ritualId: ev.ritualId,
        eventId: ev.id,
        stage: 5,
        variant: 'stage5_closeout',
        scheduledFor: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        status: 'draft',
        triggeredBy: 'cron',
        createdAt: today,
      })
    } catch (e) {
      console.error('[event-status] failed to enqueue stage5 draft for', ev.id, e)
    }
  }

  return NextResponse.json({
    started: started.length,
    concluded: concluded.length,
    events: { started, concluded },
  })
}
