import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { SKALD_SYSTEM_PROMPT } from '@/lib/skald/voice'
import { BUILTIN_ACTIVITY_TYPES } from '@/db/schema/rituals'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-haiku-4-5-20251001'

export type SkaldDistillResponse = {
  // One short Skald line acknowledging what they shared. Memento-mori register.
  acknowledgement: string
  // 3 candidate ritual names that fit what they described.
  candidateNames: string[]
  // Inferred activity slug — builtin OR a custom token like "sailing".
  activityType: string
  activityLabel: string
  isCustomActivity: boolean
}

const FALLBACK: SkaldDistillResponse = {
  acknowledgement:
    'I hear you. The bones are there. Let me set the rest down.',
  candidateNames: ['The Annual', 'The Long Cold', 'The Reckoning'],
  activityType: 'other',
  activityLabel: 'Adventure',
  isCustomActivity: false,
}

function normaliseSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const BUILTIN_LIST = BUILTIN_ACTIVITY_TYPES.join(', ')

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { intake } = (await req.json()) as { intake?: string }
  const text = (intake ?? '').trim()
  if (text.length < 4) {
    return NextResponse.json({ error: 'Tell me a bit more' }, { status: 400 })
  }

  const prompt = `The sponsor just told you about their crew and ritual in a single block of text. Distill it.

Return ONLY valid JSON, no commentary, no markdown fences:
{
  "acknowledgement": "ONE short line in your voice (Skald, memento-mori sage). Specific to what they shared. No emojis, no exclamation marks unless truly earned.",
  "candidateNames": ["NAME 1", "NAME 2", "NAME 3"],
  "activityType": one of [${BUILTIN_LIST}] OR a single lowercase token (e.g. "sailing", "rock_climbing", "poker") if none fit,
  "activityLabel": "Title Case display label, 1-3 words"
}

Rules:
- Names: dark, earned, on-the-mythology — never corporate. 3 distinct candidates.
- activityType: prefer a builtin if it fits. Only invent a custom slug if the activity is genuinely different.
- If the sponsor describes anything illegal, dangerous, or sexual, set activityType to "other" and do NOT coin a slug.
- Plain JSON only.

Their words:
"""
${text.slice(0, 2000)}
"""`

  try {
    const message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 400,
        system: [
          {
            type: 'text',
            text: SKALD_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: prompt }],
      },
      { timeout: 15_000 },
    )

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    const parsed = JSON.parse(cleaned) as {
      acknowledgement?: string
      candidateNames?: string[]
      activityType?: string
      activityLabel?: string
    }

    const slug = normaliseSlug(parsed.activityType ?? 'other') || 'other'
    const isCustom = !(BUILTIN_ACTIVITY_TYPES as readonly string[]).includes(slug)
    const label =
      (parsed.activityLabel && parsed.activityLabel.trim()) || titleCase(slug)

    const candidates = (parsed.candidateNames ?? [])
      .map((s) => String(s).trim().replace(/^["']|["']$/g, ''))
      .filter((s) => s.length > 0 && s.length < 80)
      .slice(0, 5)

    if (candidates.length < 1) throw new Error('No candidates returned')

    const response: SkaldDistillResponse = {
      acknowledgement:
        (parsed.acknowledgement ?? '').trim() || FALLBACK.acknowledgement,
      candidateNames: candidates,
      activityType: slug,
      activityLabel: label,
      isCustomActivity: isCustom,
    }
    return NextResponse.json(response)
  } catch (err) {
    console.error('[skald-distill] falling back', err)
    return NextResponse.json(FALLBACK)
  }
}
