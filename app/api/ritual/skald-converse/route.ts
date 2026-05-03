import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { SKALD_SYSTEM_PROMPT } from '@/lib/skald/voice'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-haiku-4-5-20251001'

export type SkaldPhase =
  | 'activity'   // turn after sponsor describes activity + crew
  | 'years'      // turn after sponsor says how long it has been going
  | 'phrase'     // turn after sponsor shares an inside-joke / phrase / curse
  | 'naming'     // final turn: drop 3 candidate names

export type SkaldMessage = { role: 'user' | 'assistant'; content: string }

export type SkaldConverseResponse = {
  assistantText: string
  candidateNames?: string[]
  done?: boolean
}

// Hardcoded fallbacks per phase — used when Anthropic call fails or the model
// returns garbage. Topic still progresses so the flow never dies.
const FALLBACKS: Record<SkaldPhase, string> = {
  activity:
    'Sixteen winters or one — what does it matter. Tell me, then: how long have you and your people been doing this together?',
  years:
    'Years are the ribs of a ritual. Now: is there a phrase the crew already says about this trip? A nickname, an inside joke, a curse?',
  phrase:
    'Hold. Listen. Some names that whisper themselves: The Long Cold, The Reckoning, The Annual. Tell me which one fits — or speak your own.',
  naming:
    'Some names that whisper themselves: The Long Cold, The Reckoning, The Annual.',
}

function phasePrompt(phase: SkaldPhase): string {
  switch (phase) {
    case 'activity':
      return `Phase: ACTIVITY.
The sponsor just described what their crew does. Acknowledge it in one short line — specific to what they said, no generic praise. Then ask: how long has this been going? First time, fifth, fifteenth?

Output rules:
- 2-3 short sentences total.
- No emoji. No exclamation marks unless one is truly earned.
- Speak as the Skald in first person ("I").
- End with the question about years.
- Plain text only. No JSON, no markdown.`
    case 'years':
      return `Phase: YEARS.
The sponsor just told you how long the ritual has been running. React in one short line — if it is many years, treat it with gravity; if it is the first, treat it as the seed of the saga. Then ask: is there a phrase, nickname, or inside joke the crew already says about this trip? A curse counts.

Output rules:
- 2-3 short sentences total.
- No emoji. No exclamation marks unless earned.
- Speak as the Skald in first person.
- End with the question about a phrase / nickname / inside joke.
- Plain text only.`
    case 'phrase':
      return `Phase: PHRASE.
The sponsor just shared a phrase or nickname (or said there isn't one). React briefly. Then propose THREE candidate ritual names that fit everything you have learned so far (activity, years, vibe, phrase). The names should feel earned, dark, on-the-mythology — not corporate.

Output rules:
- Begin with one short reaction sentence.
- Then on a new line, write EXACTLY: "Some names that whisper themselves: NAME1, NAME2, NAME3"
- Names must be comma-separated, no quotes around them.
- After the name line, no extra commentary.
- Speak as the Skald in first person.
- Plain text only. No JSON, no markdown.`
    case 'naming':
      return `Phase: NAMING.
The sponsor wants more name candidates. Propose THREE more, different from any earlier suggestions, fitting the same crew/activity/vibe.

Output rules:
- Single line: "Some names that whisper themselves: NAME1, NAME2, NAME3"
- No reaction sentence, no commentary.
- Plain text only.`
  }
}

const PHASE_PATTERN = /Some names that whisper themselves:\s*(.+)$/im

function extractCandidates(text: string): string[] | undefined {
  const match = text.match(PHASE_PATTERN)
  if (!match) return undefined
  const list = match[1]
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter((s) => s.length > 0 && s.length < 80)
  return list.length > 0 ? list : undefined
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messages, phase } = (await req.json()) as {
    messages: SkaldMessage[]
    phase: SkaldPhase
  }

  if (!Array.isArray(messages) || !phase) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const directive = phasePrompt(phase)

  // Append the phase directive as a final assistant-targeted user message.
  // Conversation history before this is the back-and-forth so far.
  const conversationMessages = messages
    .filter((m) => m.content.trim().length > 0)
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content }))

  conversationMessages.push({
    role: 'user',
    content: `[Skald instruction — do not echo this label] ${directive}`,
  })

  try {
    const message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 256,
        // Prompt caching — system prompt is identical every turn.
        system: [
          {
            type: 'text',
            text: SKALD_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: conversationMessages,
      },
      { timeout: 12_000 }
    )

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const text = raw.trim()

    if (!text) throw new Error('Empty response')

    const candidates = extractCandidates(text)
    const response: SkaldConverseResponse = {
      assistantText: text,
      ...(candidates && { candidateNames: candidates }),
      ...((phase === 'phrase' || phase === 'naming') && { done: true }),
    }
    return NextResponse.json(response)
  } catch (err) {
    console.error('[skald-converse] falling back', err)
    const fallback = FALLBACKS[phase]
    const candidates = extractCandidates(fallback)
    const response: SkaldConverseResponse = {
      assistantText: fallback,
      ...(candidates && { candidateNames: candidates }),
      ...((phase === 'phrase' || phase === 'naming') && { done: true }),
    }
    return NextResponse.json(response)
  }
}
