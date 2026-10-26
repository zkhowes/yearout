// Fire a Call email immediately for sponsor-driven stages (2, 3, 5).
// Stages 1, 3a, 3b, 4, 6 go through the draft queue + sponsor approval flow.
// Errors are never thrown — email failure must NEVER block the underlying
// state transition (event creation, lock-in, conclude, etc). Instead each
// fire* returns a DispatchResult so the caller can surface *why* nothing was
// sent (rate limit, no recipients, send error) rather than failing silently.

import {
  buildStage2Vote,
  buildStage3Confirmed,
  buildStage5Closeout,
  loadRecipients,
  type CallContent,
} from '@/lib/call/content'
import { generateCallCopy, fallbackCopy, type AiCopy } from '@/lib/ai/call-copy'
import { renderCallElement, variantToStage } from '@/lib/call/render'
import { sendCallEmail } from '@/lib/email/send'
import { checkCallRateLimits } from '@/lib/call/rate-limit'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'

export type DispatchResult =
  | { sent: true; resendId?: string }
  | {
      sent: false
      reason: 'no_content' | 'rate_limited' | 'no_recipients' | 'send_failed'
      detail?: string
    }

async function dispatch(
  content: CallContent | null,
  triggeredBy: 'sponsor' | 'system'
): Promise<DispatchResult> {
  if (!content) return { sent: false, reason: 'no_content' }

  const ritualId =
    'ritual' in content ? content.ritual.id : content.event.ritualId
  const eventId = 'event' in content ? content.event.id : null

  // Soft rate limit (sponsor-triggered Stages 2/3/5 should always pass since
  // the sponsor is in control, but the monthly cap still applies)
  const limit = await checkCallRateLimits({
    variant: content.variant,
    ritualId,
    triggeredBy: triggeredBy === 'system' ? 'cron' : 'sponsor',
  })
  if (!limit.allowed) {
    console.warn('[call dispatch] rate-limited', content.variant, limit.reason)
    return { sent: false, reason: 'rate_limited', detail: limit.reason }
  }

  let copy: AiCopy
  try {
    copy = await generateCallCopy(content)
  } catch (e) {
    console.error('[call dispatch] AI copy failed, using fallback', e)
    copy = fallbackCopy(content)
  }

  const recipients = await loadRecipients(ritualId)
  if (recipients.emails.length === 0) {
    console.warn('[call dispatch] no recipients for ritual', ritualId)
    return { sent: false, reason: 'no_recipients' }
  }

  try {
    const result = await sendCallEmail({
      react: renderCallElement(content, copy),
      subject: copy.subject || 'The Call',
      mode: { kind: 'send', to: recipients.emails },
      log: {
        ritualId,
        eventId,
        stage: variantToStage(content.variant),
        variant: content.variant,
        aiCopy: copy,
        triggeredBy: triggeredBy === 'system' ? 'system' : 'sponsor',
      },
      tags: [
        { name: 'env', value: triggeredBy },
        { name: 'variant', value: content.variant },
      ],
    })
    if (result.error) {
      console.error('[call dispatch] send failed', content.variant, result.error)
      return { sent: false, reason: 'send_failed', detail: result.error }
    }
    return { sent: true, resendId: result.resendId }
  } catch (e) {
    console.error('[call dispatch] send failed', content.variant, e)
    return {
      sent: false,
      reason: 'send_failed',
      detail: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}

export async function fireStage2Vote(eventId: string): Promise<DispatchResult> {
  const content = await buildStage2Vote(eventId, APP_URL)
  return dispatch(content, 'sponsor')
}

export async function fireStage3Confirmed(eventId: string): Promise<DispatchResult> {
  const content = await buildStage3Confirmed(eventId, APP_URL)
  return dispatch(content, 'sponsor')
}

export async function fireStage5Closeout(eventId: string): Promise<DispatchResult> {
  // Per-recipient balance is omitted in the broadcast version (use null)
  const content = await buildStage5Closeout(eventId, null, APP_URL)
  return dispatch(content, 'sponsor')
}
