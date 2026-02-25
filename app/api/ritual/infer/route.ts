import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type RitualInference = {
  activityType: 'ski' | 'golf' | 'mountain_biking' | 'fishing' | 'backpacking' | 'family' | 'girls_trip' | 'other'
  theme: 'circuit' | 'club' | 'trail' | 'getaway'
  tagline: string
  awards: string[] // [mvp name, lup name]
  slug: string
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: 'Name too short' }, { status: 400 })
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `You are helping set up a group's annual adventure ritual (a recurring trip tradition).

Given the ritual name below, infer the best defaults. Be punchy and opinionated.

Name: "${name.trim()}"

Respond with ONLY valid JSON matching this exact structure:
{
  "activityType": one of [ski, golf, mountain_biking, fishing, backpacking, family, girls_trip, other],
  "theme": one of [circuit, club, trail, getaway],
  "tagline": "3-6 word punchy phrase capturing the vibe",
  "awards": ["MVP award name", "anti-award / LUP name"],
  "slug": "url-safe-lowercase-no-spaces"
}

Theme guide: circuit=dark/grungy/hard-charging, club=refined/luxury/golf/whiskey, trail=earthy/gear/outdoors, getaway=warm/casual/family
Awards should fit the ritual's personality. Be creative but appropriate.`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const inference: RitualInference = JSON.parse(raw)
    return NextResponse.json(inference)
  } catch {
    return NextResponse.json({ error: 'Inference failed' }, { status: 500 })
  }
}
