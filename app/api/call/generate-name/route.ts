import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { location, year, ritualName } = await req.json()
  if (!location || !year) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 64,
      messages: [
        {
          role: 'user',
          content: `Generate a single fun, punchy event name that mashes the location name with the year or an adventure vibe. The name should be a portmanteau or creative wordplay. It's for a group adventure trip called "${ritualName || 'the crew'}".

Location: ${location}
Year: ${year}

Examples of the style:
- "Spokarnage 2026" (Spokane)
- "Whistpocalypse 2025" (Whistler)
- "Tahoe Throwdown 2024" (Lake Tahoe)
- "Breckageddon 2026" (Breckenridge)

Return ONLY the event name, nothing else. No quotes, no explanation.`,
        },
      ],
    }, { timeout: 10_000 })

    const name = (message.content[0].type === 'text' ? message.content[0].text : '').trim()

    if (name && name.length < 100) {
      return NextResponse.json({ name })
    }

    return NextResponse.json({ name: `${location} ${year}` })
  } catch (err) {
    console.error('[generate-name] error:', err)
    return NextResponse.json({ name: `${location} ${year}` })
  }
}
