'use client'

import { useState, useTransition } from 'react'
import {
  cancelDraft,
  sendDraft,
  snoozeDraft,
  sponsorTriggerSummons,
  type DraftPreview,
  type RateMeter,
} from './actions'

interface Props {
  ritualSlug: string
  ritualName: string
  drafts: DraftPreview[]
  meter: RateMeter
}

export function TheCallClient({ ritualSlug, ritualName, drafts, meter }: Props) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(drafts[0]?.id ?? null)

  function trigger() {
    setStatus('Drafting...')
    startTransition(async () => {
      try {
        await sponsorTriggerSummons(ritualSlug)
        setStatus('Draft created. Refresh to see it below.')
      } catch (e: unknown) {
        setStatus(`Could not draft: ${e instanceof Error ? e.message : String(e)}`)
      }
    })
  }

  function send(id: string) {
    if (!confirm('Send this Call to the entire crew?')) return
    setStatus('Sending...')
    startTransition(async () => {
      try {
        await sendDraft(ritualSlug, id)
        setStatus('Sent.')
      } catch (e: unknown) {
        setStatus(`Send failed: ${e instanceof Error ? e.message : String(e)}`)
      }
    })
  }

  function cancel(id: string) {
    setStatus('Cancelling...')
    startTransition(async () => {
      try {
        await cancelDraft(ritualSlug, id)
        setStatus('Cancelled.')
      } catch (e: unknown) {
        setStatus(`${e instanceof Error ? e.message : String(e)}`)
      }
    })
  }

  function snooze(id: string) {
    setStatus('Snoozing...')
    startTransition(async () => {
      try {
        await snoozeDraft(ritualSlug, id)
        setStatus('Snoozed for 7 days.')
      } catch (e: unknown) {
        setStatus(`${e instanceof Error ? e.message : String(e)}`)
      }
    })
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>The Call · {ritualName}</h1>
      <p style={{ color: 'var(--fg-muted)', fontSize: '14px', marginTop: 0 }}>
        Drafts of upcoming Calls. Preview, edit, send, or cancel.
      </p>

      {/* Rate meter */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          padding: '12px',
          backgroundColor: 'var(--surface)',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px',
        }}
      >
        <Meter label="Stage 1 / 14d" used={meter.stage1Used} limit={meter.stage1Limit} />
        <Meter label="All / 30d" used={meter.monthlyUsed} limit={meter.monthlyLimit} />
      </div>

      <button
        onClick={trigger}
        disabled={pending || meter.stage1Used >= meter.stage1Limit}
        style={primaryButton}
      >
        {meter.stage1Used >= meter.stage1Limit
          ? 'Send the Summons (rate limited)'
          : 'Send the Summons now'}
      </button>

      {status ? (
        <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--accent)' }}>{status}</div>
      ) : null}

      <h2 style={{ fontSize: '16px', marginTop: '32px', marginBottom: '8px' }}>Drafts</h2>

      {drafts.length === 0 ? (
        <p style={{ color: 'var(--fg-muted)', fontSize: '14px' }}>
          No drafts in queue. Cron drafts new ones daily; or use the button above to draft a Stage 1 manually.
        </p>
      ) : (
        drafts.map((d) => (
          <div
            key={d.id}
            style={{
              border: '1px solid var(--border)',
              borderRadius: '8px',
              marginBottom: '12px',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setOpenId(openId === d.id ? null : d.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                backgroundColor: openId === d.id ? 'var(--surface)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'inherit',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>
                    {d.subject || d.variant}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginTop: '4px' }}>
                    {d.variant} · drafted {new Date(d.createdAt).toLocaleDateString()} · {d.recipientCount} recipients · {d.triggeredBy}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--fg-muted)' }}>
                  {openId === d.id ? '▲' : '▼'}
                </div>
              </div>
            </button>

            {openId === d.id ? (
              <div style={{ padding: '0 16px 16px' }}>
                {d.error ? (
                  <div style={{ color: '#dc2626', fontSize: '13px', padding: '8px' }}>
                    {d.error}
                  </div>
                ) : null}

                {d.html ? (
                  <iframe
                    srcDoc={d.html}
                    style={{
                      width: '100%',
                      height: '500px',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                    }}
                    title={d.subject || d.variant}
                  />
                ) : null}

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button onClick={() => send(d.id)} disabled={pending} style={primaryButton}>
                    Send now
                  </button>
                  <button onClick={() => snooze(d.id)} disabled={pending} style={secondaryButton}>
                    Snooze 7 days
                  </button>
                  <button onClick={() => cancel(d.id)} disabled={pending} style={ghostButton}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  )
}

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, (used / Math.max(1, limit)) * 100)
  const color = used >= limit ? '#dc2626' : used >= limit * 0.75 ? '#d97706' : 'var(--accent)'
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', marginTop: '2px' }}>
        {used} / {limit}
      </div>
      <div style={{ height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', marginTop: '4px' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '2px' }} />
      </div>
    </div>
  )
}

const primaryButton: React.CSSProperties = {
  backgroundColor: 'var(--accent)',
  color: 'var(--accent-fg)',
  border: 'none',
  borderRadius: '6px',
  padding: '10px 18px',
  fontSize: '14px',
  cursor: 'pointer',
  fontWeight: 600,
}
const secondaryButton: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: 'var(--fg)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '10px 18px',
  fontSize: '14px',
  cursor: 'pointer',
}
const ghostButton: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: 'var(--fg-muted)',
  border: 'none',
  padding: '10px 18px',
  fontSize: '14px',
  cursor: 'pointer',
}
