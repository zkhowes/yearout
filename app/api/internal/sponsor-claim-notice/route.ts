import { NextResponse, type NextRequest } from 'next/server'
import { sendSponsorClaimNotice } from '@/lib/sponsor-claim-notice'

export const runtime = 'nodejs'

/**
 * Internal-only endpoint called by the auth.ts signIn callback to fire
 * the sponsor claim notice email. Lives behind a shared secret so it's
 * not abusable from outside the app.
 *
 * It exists as an HTTP boundary specifically so the email stack (which
 * imports node:fs/promises) stays out of the middleware/auth bundle.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.INTERNAL_WEBHOOK_SECRET
  if (!expected) {
    // No secret configured — only allow same-origin requests as a soft fallback.
    const origin = req.headers.get('origin') ?? ''
    const host = req.headers.get('host') ?? ''
    if (origin && !origin.includes(host)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  } else {
    const got = req.headers.get('x-internal-secret') ?? ''
    if (got !== expected) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  const body = (await req.json().catch(() => null)) as
    | { ritualId: string; placeholderName: string | null; claimedByName: string | null; claimedByEmail: string }
    | null
  if (!body?.ritualId || !body?.claimedByEmail) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  try {
    await sendSponsorClaimNotice(body)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[sponsor-claim-notice] send failed', e)
    return NextResponse.json({ error: 'send failed' }, { status: 500 })
  }
}
