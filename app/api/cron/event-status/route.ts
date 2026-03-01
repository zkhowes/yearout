import { NextResponse } from 'next/server'
import { db } from '@/db'
import { events } from '@/db/schema'
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

  return NextResponse.json({
    started: started.length,
    events: started,
  })
}
