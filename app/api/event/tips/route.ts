import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { events } from '@/db/schema'
import { eq } from 'drizzle-orm'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { eventId, location, activityType, mountains, startDate } = await req.json()
  if (!eventId || !location) {
    return NextResponse.json({ tips: [] })
  }

  // Check for cached tips
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: { aiTips: true },
  })

  if (event?.aiTips) {
    try {
      return NextResponse.json({ tips: JSON.parse(event.aiTips) })
    } catch {
      // Corrupted cache, regenerate
    }
  }

  try {
    const month = startDate
      ? new Date(startDate).toLocaleString('en-US', { month: 'long' })
      : 'unknown month'

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You're a savvy travel advisor for a group adventure trip. Generate 4-5 short, practical travel tips for this trip:

Location: ${location}
Activity: ${activityType ?? 'adventure'}
Venues/Mountains: ${mountains ?? 'N/A'}
Month: ${month}

Consider:
- Packing essentials specific to the activity and season
- Whether passports/documents might be needed (infer from location)
- Local tips, altitude, weather preparation
- Activity-specific gear or preparation
- Travel logistics (airport, driving conditions, etc.)

Return ONLY a JSON array of strings, each tip being 1-2 sentences. Be specific and actionable, not generic. Example format:
["Tip 1 here.", "Tip 2 here."]`,
        },
      ],
    }, { timeout: 10_000 })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '[]'
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const tips: string[] = JSON.parse(cleaned)

    // Cache in DB
    await db.update(events).set({ aiTips: JSON.stringify(tips) }).where(eq(events.id, eventId))

    return NextResponse.json({ tips })
  } catch (err) {
    console.error('[tips] generation error:', err)
    return NextResponse.json({ tips: [] })
  }
}
