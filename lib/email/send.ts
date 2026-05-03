import { Resend } from 'resend'
import { render } from '@react-email/components'
import * as React from 'react'
import { mkdir, writeFile } from 'node:fs/promises'
import { db } from '@/db'
import { callSends } from '@/db/schema'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'Yearout <call@send.yearout.zkhowes.fun>'
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || 'zkhowes@gmail.com'

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

export type SendMode =
  | { kind: 'preview' }                              // render only, never touch network or disk
  | { kind: 'dry_run' }                              // render to tmp/email-preview/*.html
  | { kind: 'send'; to: string[] }                   // real Resend send

export interface SendCallEmailInput {
  /** React element from one of the emails/Stage*.tsx templates. */
  react: React.ReactElement
  subject: string
  mode: SendMode
  /** Persistence — written to call_sends only when mode.kind === 'send'. */
  log?: {
    ritualId: string
    eventId?: string | null
    stage: number
    variant?: string | null
    aiCopy?: unknown
    triggeredBy: 'cron' | 'sponsor' | 'admin' | 'system'
  }
  /** Per-send Resend tags for filtering in their dashboard. */
  tags?: { name: string; value: string }[]
}

export interface SendCallEmailResult {
  mode: SendMode['kind']
  html: string
  /** Set when mode is 'dry_run'. */
  filePath?: string
  /** Set when mode is 'send'. */
  resendId?: string
  /** Set when mode is 'send' AND the call_sends row was written. */
  callSendId?: string
  error?: string
}

/**
 * Effective send-allowed gate for production-style sends.
 * Preview deployments default to dry-run unless SEND_REAL_EMAILS=true.
 */
function realSendsAllowed(): boolean {
  if (process.env.SEND_REAL_EMAILS === 'true') return true
  if (process.env.VERCEL_ENV === 'production') return true
  return false
}

export async function sendCallEmail(
  input: SendCallEmailInput
): Promise<SendCallEmailResult> {
  const html = await render(input.react)

  if (input.mode.kind === 'preview') {
    return { mode: 'preview', html }
  }

  if (input.mode.kind === 'dry_run') {
    const dir = 'tmp/email-preview'
    await mkdir(dir, { recursive: true })
    const slug = `${Date.now()}-${input.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`
    const filePath = `${dir}/${slug}.html`
    await writeFile(filePath, html, 'utf8')
    return { mode: 'dry_run', html, filePath }
  }

  // Real send
  if (!resend) {
    return {
      mode: 'send',
      html,
      error: 'RESEND_API_KEY not configured',
    }
  }

  if (!realSendsAllowed()) {
    return {
      mode: 'send',
      html,
      error: 'Real sends disabled in this environment (set SEND_REAL_EMAILS=true to override)',
    }
  }

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: input.mode.to,
    replyTo: EMAIL_REPLY_TO,
    subject: input.subject,
    html,
    tags: input.tags,
  })

  if (error || !data) {
    return {
      mode: 'send',
      html,
      error: error?.message || 'Resend returned no data',
    }
  }

  // Log to call_sends — fire-and-forget so a logging failure doesn't lose the send
  let callSendId: string | undefined
  if (input.log) {
    try {
      callSendId = crypto.randomUUID()
      await db.insert(callSends).values({
        id: callSendId,
        ritualId: input.log.ritualId,
        eventId: input.log.eventId ?? null,
        stage: input.log.stage,
        variant: input.log.variant ?? null,
        aiCopy: input.log.aiCopy as object | null,
        recipients: input.mode.to,
        resendMessageId: data.id,
        status: 'sent',
        triggeredBy: input.log.triggeredBy,
        sentAt: new Date(),
      })
    } catch (e) {
      console.error('[email] sent OK but call_sends insert failed', e)
    }
  }

  return {
    mode: 'send',
    html,
    resendId: data.id,
    callSendId,
  }
}
