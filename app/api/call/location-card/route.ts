import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/db'
import { callLocationOptions, events, loreEntries } from '@/db/schema'
import { eq, and, ilike, sql } from 'drizzle-orm'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type LocationCard = {
  venues: string[]
  dining: string[]
  facts: string[]
  pastEvents: { year: number; highlights: string[] }[]
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { locationOptionId, locationName, ritualId } = await req.json()
  if (!locationOptionId || !locationName || !ritualId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Check cache
  const option = await db.query.callLocationOptions.findFirst({
    where: eq(callLocationOptions.id, locationOptionId),
    columns: { aiCard: true },
  })
  if (option?.aiCard) {
    try {
      return NextResponse.json({ card: JSON.parse(option.aiCard) })
    } catch {
      // Corrupted, regenerate
    }
  }

  // Look up past events at this location
  const pastEventsAtLocation = await db
    .select({ id: events.id, year: events.year, location: events.location })
    .from(events)
    .where(
      and(
        eq(events.ritualId, ritualId),
        eq(events.status, 'closed'),
        ilike(events.location, `%${locationName.split(',')[0].trim()}%`),
      )
    )

  // Grab sample lore from those events (prefer HOF)
  const pastEventData: { year: number; highlights: string[] }[] = []
  for (const pe of pastEventsAtLocation.slice(0, 3)) {
    const lore = await db
      .select({ content: loreEntries.content, isHof: loreEntries.isHallOfFame })
      .from(loreEntries)
      .where(
        and(
          eq(loreEntries.eventId, pe.id),
          sql`${loreEntries.content} IS NOT NULL`,
        )
      )
      .orderBy(sql`${loreEntries.isHallOfFame} DESC`)
      .limit(3)

    pastEventData.push({
      year: pe.year,
      highlights: lore.map((l) => l.content!).filter(Boolean),
    })
  }

  try {
    const pastContext = pastEventData.length > 0
      ? `\n\nThis crew has been to this location before:\n${pastEventData.map((pe) =>
          `- ${pe.year}: ${pe.highlights.length > 0 ? pe.highlights.join('; ') : 'no lore recorded'}`
        ).join('\n')}`
      : ''

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 768,
      messages: [
        {
          role: 'user',
          content: `You're a savvy adventure travel advisor helping a group decide where to go. Generate an exciting info card for this destination:

Location: ${locationName}${pastContext}

Return ONLY a JSON object with these fields:
- "venues": array of 3-4 key activities/venues/mountains/attractions (string[])
- "dining": array of 2-3 notable dining/nightlife highlights (string[])
- "facts": array of 2-3 cool/fun facts about the location (string[])

${pastEventData.length > 0 ? '- "pastEvents": array of objects { "year": number, "highlights": string[] } summarizing what this crew experienced there before. Reference the lore I provided. Make it nostalgic and exciting.\n' : ''}
Be specific and enthusiastic. Make people want to go here. Keep each item to 1 sentence.`,
        },
      ],
    }, { timeout: 15_000 })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const card: LocationCard = JSON.parse(cleaned)

    // Ensure pastEvents from DB are included even if AI omits them
    if (pastEventData.length > 0 && (!card.pastEvents || card.pastEvents.length === 0)) {
      card.pastEvents = pastEventData
    }

    // Cache
    await db
      .update(callLocationOptions)
      .set({ aiCard: JSON.stringify(card) })
      .where(eq(callLocationOptions.id, locationOptionId))

    return NextResponse.json({ card })
  } catch (err) {
    console.error('[location-card] generation error:', err)
    // Return basic card with past events if available
    const fallback: LocationCard = {
      venues: [],
      dining: [],
      facts: [],
      pastEvents: pastEventData,
    }
    return NextResponse.json({ card: fallback })
  }
}
