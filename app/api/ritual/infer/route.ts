import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { BUILTIN_ACTIVITY_TYPES, isBuiltinActivityType } from '@/db/schema/rituals'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type RitualInference = {
  // Slug — either one of BUILTIN_ACTIVITY_TYPES or a free-text token like "sailing"
  activityType: string
  // Display label, e.g. "Sailing"
  activityLabel: string
  // True if activityType is not in BUILTIN_ACTIVITY_TYPES — caller may want to
  // create a per-ritual template row.
  isCustomActivity: boolean
  theme: 'circuit' | 'club' | 'trail' | 'getaway'
  tagline: string
  awards: string[] // [mvp name, lup name]
  slug: string
}

const BUILTIN_LIST = BUILTIN_ACTIVITY_TYPES.join(', ')

function normaliseActivitySlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
}

function titleCase(s: string): string {
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, context } = (await req.json()) as { name?: string; context?: string }
  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: 'Name too short' }, { status: 400 })
  }

  const contextLine =
    typeof context === 'string' && context.trim().length > 0
      ? `\nAdditional context from the sponsor: ${context.trim().slice(0, 1500)}`
      : ''

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 320,
    messages: [
      {
        role: 'user',
        content: `You are helping set up a group's annual adventure ritual (a recurring trip tradition).

Given the ritual name and any context below, infer the best defaults. Be punchy and opinionated.

Name: "${name.trim()}"${contextLine}

Respond with ONLY valid JSON matching this exact structure:
{
  "activityType": one of [${BUILTIN_LIST}] OR a single lowercase word/snake_case slug (e.g. "sailing", "rock_climbing", "poker") if the activity is clearly different and none of the builtins fit,
  "activityLabel": display label, Title Case, 1-3 words (e.g. "Sailing", "Rock Climbing"),
  "theme": one of [circuit, club, trail, getaway],
  "tagline": "3-6 word punchy phrase capturing the vibe",
  "awards": ["MVP award name", "anti-award / LUP name"],
  "slug": "url-safe-lowercase-no-spaces"
}

Activity rules:
- Strongly prefer a builtin if it fits. Only use a custom slug if the activity is genuinely different (sailing, climbing, poker night, hunting, road trip, etc.).
- If the sponsor describes something illegal, dangerous, or sexual, use "other" — never coin a slug for it.
- The slug is one short token, snake_case, no spaces, no emojis.

Theme guide: circuit=dark/grungy/hard-charging, club=refined/luxury/golf/whiskey, trail=earthy/gear/outdoors, getaway=warm/casual/family
Awards should fit the ritual's personality. Be creative but appropriate.`,
      },
    ],
  }, { timeout: 12_000 })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  // Strip markdown code fences if present (e.g. ```json ... ```)
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  try {
    const parsed = JSON.parse(cleaned) as Omit<RitualInference, 'activityLabel' | 'isCustomActivity'> & {
      activityLabel?: string
    }

    const slug = normaliseActivitySlug(parsed.activityType ?? 'other') || 'other'
    const isCustom = !isBuiltinActivityType(slug)
    const label =
      (parsed.activityLabel && parsed.activityLabel.trim()) ||
      (isCustom ? titleCase(slug) : titleCase(slug))

    const inference: RitualInference = {
      ...parsed,
      activityType: slug,
      activityLabel: label,
      isCustomActivity: isCustom,
    }
    return NextResponse.json(inference)
  } catch {
    console.error('[infer] failed to parse Claude response as JSON')
    return NextResponse.json({ error: 'Inference failed' }, { status: 500 })
  }
}
