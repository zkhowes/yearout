import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { put } from '@vercel/blob'
import { auth } from '@/auth'

const MODEL = 'gemini-2.5-flash-image'

export type GenerateLogoRequest = {
  ritualName: string
  tagline?: string
  activityLabel: string
  theme: 'circuit' | 'club' | 'trail' | 'getaway'
  context?: string
}

export type GenerateLogoResponse = {
  url: string
}

const THEME_DIRECTION: Record<GenerateLogoRequest['theme'], string> = {
  circuit:
    'dark grungy palette: deep black background, weathered gold accents (#c9a84c), small touch of crimson allowed; rugged ski/race aesthetic; feels earned and slightly menacing.',
  club:
    'refined classic palette: deep navy or oxblood, ivory and aged gold; whiskey/golf/old-money vibe; serif lettering, etched line work, crest-like.',
  trail:
    'earthy outdoor palette: forest green, kraft tan, charcoal; topo-line / contour-line motifs; gear-store stamp aesthetic; rugged but warm.',
  getaway:
    'warm casual palette: terracotta orange, cream, sun yellow; family/beach/sun-and-palm vibe; rounded shapes; joyful, never corporate.',
}

function buildPrompt(req: GenerateLogoRequest): string {
  const themeLine = THEME_DIRECTION[req.theme]
  const ctx = req.context?.trim()
    ? `\n\nWhat the sponsor told the Skald (use this for inside-joke / vibe; do NOT include text from this verbatim):\n"""${req.context.trim().slice(0, 800)}"""`
    : ''
  return `Design a clean, sharp, professional **logo emblem** for a recurring annual adventure ritual called "${req.ritualName}".

Tagline / motto: ${req.tagline ? `"${req.tagline}"` : '(none)'}
Activity: ${req.activityLabel}
Theme direction: ${themeLine}

CRITICAL output rules:
- Square 1:1 aspect ratio.
- Self-contained emblem on a single solid background — no busy scenery.
- The emblem will be displayed inside a circular avatar crop. Compose so ALL meaningful detail (iconography + name) sits inside the inscribed circle (centered, fills ~85% of the frame). Only the solid background may extend into the four corners — never put icons, letters, or important detail there.
- Vector / flat / screenprint feel. High contrast. Clean edges. No 3D rendering, no photorealism, no lens flare, no gradients beyond a single subtle one.
- Bold iconography that references the activity (e.g. mountains for ski, anchor/sail for sailing, tee/club for golf, wheel/sprocket for biking) — but stylised, never literal stock-art.
- The ritual NAME may appear once, in clean readable typography, integrated into the emblem (curved around it, banner, or inside a shield). Spell the name EXACTLY: "${req.ritualName}". No other text.
- No watermarks, signatures, web addresses, hashtags, mascots, gradient meshes, or photographic textures.
- The whole thing should look like it could be screenprinted on a hat or hoodie and stand for 30 years.${ctx}

Output: a single image. No commentary, no alternatives.`
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured' },
      { status: 500 },
    )
  }

  const body = (await req.json()) as Partial<GenerateLogoRequest>
  if (!body.ritualName || !body.activityLabel || !body.theme) {
    return NextResponse.json(
      { error: 'Missing ritualName, activityLabel, or theme' },
      { status: 400 },
    )
  }

  const ai = new GoogleGenAI({ apiKey })
  const prompt = buildPrompt(body as GenerateLogoRequest)

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    })

    const parts = response.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p) => p.inlineData?.data)
    if (!imagePart?.inlineData?.data) {
      return NextResponse.json(
        { error: 'Model returned no image' },
        { status: 502 },
      )
    }

    const mime = imagePart.inlineData.mimeType ?? 'image/png'
    const buffer = Buffer.from(imagePart.inlineData.data, 'base64')
    const ext = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png'

    const blob = await put(`ritual-logos/${crypto.randomUUID()}.${ext}`, buffer, {
      access: 'public',
      contentType: mime,
    })

    const out: GenerateLogoResponse = { url: blob.url }
    return NextResponse.json(out)
  } catch (err) {
    console.error('[generate-logo] failed', err)
    const msg = err instanceof Error ? err.message : 'Logo generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
