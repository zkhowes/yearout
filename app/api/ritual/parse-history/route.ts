import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type ParsedHistoryRow = {
  year: number
  location: string
  mountains?: string
  memory?: string
}

export type ParseHistoryResponse = {
  rows: ParsedHistoryRow[]
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ritualName, freeform } = (await req.json()) as {
    ritualName?: string
    freeform?: string
  }

  if (!freeform || freeform.trim().length < 3) {
    return NextResponse.json({ error: 'Nothing to parse' }, { status: 400 })
  }

  const message = await client.messages.create(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are extracting structured event history from a sponsor's freeform brain-dump for the ritual${ritualName ? ` "${ritualName}"` : ''}.

The sponsor's text follows the --- divider below. It may contain dates, locations, mountains/venues, host names, award winners, and memories — in any order, possibly across multiple years.

Extract one row per year mentioned. For each row, capture:
- year (required, integer 1900-${new Date().getFullYear()})
- location (required, the place — city/region)
- mountains (optional, comma-separated venues if mentioned)
- memory (optional, the most distinctive sentence about that year — a single sentence, verbatim or near-verbatim, suitable as a lore entry)

Skip any year you cannot anchor to a location. If a year has multiple memories, pick the most distinctive one.

Respond with ONLY valid JSON, no preamble, no markdown:
{ "rows": [ { "year": 2009, "location": "South Lake Tahoe, CA", "mountains": "Heavenly", "memory": "..." } ] }

---
${freeform.trim().slice(0, 5000)}`,
        },
      ],
    },
    { timeout: 15_000 }
  )

  const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  // Fall back to extracting the first {...} block if the model added preamble
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : cleaned

  try {
    const parsed = JSON.parse(jsonStr) as { rows?: unknown }
    const rows = Array.isArray(parsed.rows) ? parsed.rows : []
    const cleanRows: ParsedHistoryRow[] = []
    const thisYear = new Date().getFullYear()

    for (const r of rows) {
      if (!r || typeof r !== 'object') continue
      const row = r as Record<string, unknown>
      const year = Number(row.year)
      const location = typeof row.location === 'string' ? row.location.trim() : ''
      if (!Number.isFinite(year) || year < 1900 || year > thisYear) continue
      if (!location) continue
      cleanRows.push({
        year,
        location,
        mountains: typeof row.mountains === 'string' ? row.mountains.trim() || undefined : undefined,
        memory: typeof row.memory === 'string' ? row.memory.trim() || undefined : undefined,
      })
    }

    return NextResponse.json({ rows: cleanRows } satisfies ParseHistoryResponse)
  } catch {
    console.error('[parse-history] failed to parse Claude response')
    return NextResponse.json({ error: 'Could not parse history' }, { status: 500 })
  }
}
