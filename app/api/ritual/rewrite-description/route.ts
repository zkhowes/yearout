import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { description, ritualName, activityType } = await req.json()
  if (!description || typeof description !== 'string' || description.trim().length < 5) {
    return NextResponse.json({ error: 'Description too short' }, { status: 400 })
  }

  // Cap input to prevent outsized token costs
  const trimmedDesc = description.trim().slice(0, 2000)

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Rewrite the following description for an annual group adventure ritual called "${ritualName}" (activity: ${activityType}). Make it more compelling, epic, and memorable — like it belongs in a mythology. Keep it concise (2-3 paragraphs max). Preserve any specific facts or details from the original. Return ONLY the rewritten text, no preamble.

Original:
${trimmedDesc}`,
      },
    ],
  }, { timeout: 10_000 })

  const textBlock = message.content.find((b) => b.type === 'text')
  const rewritten = textBlock?.text ?? description

  return NextResponse.json({ rewritten })
}
