'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  buildPreview,
  listEvents,
  sendTestEmail,
  sendToCrew,
  type BuildResult,
  type EventOption,
  type RitualOption,
} from './actions'
import type { CallVariant } from '@/lib/call/content'

type RecipientMode = 'preview' | 'test_address' | 'real_crew'

interface VariantSpec {
  value: CallVariant
  label: string
  needs: { event?: 'optional' | 'required'; recipient?: 'required' }
}

const VARIANTS: VariantSpec[] = [
  { value: 'stage1_cold_start', label: 'Stage 1 — Cold Start (no event)', needs: {} },
  { value: 'stage1_ongoing', label: 'Stage 1 — Ongoing (no event)', needs: {} },
  { value: 'stage2_vote', label: 'Stage 2 — Vote (planning)', needs: { event: 'required' } },
  { value: 'stage3_confirmed', label: 'Stage 3 — Confirmed (scheduled)', needs: { event: 'required' } },
  { value: 'stage3a_commit', label: 'Stage 3a — Commit nudge (per-recipient)', needs: { event: 'required', recipient: 'required' } },
  { value: 'stage3b_pack_list', label: 'Stage 3b — Pack list reminder', needs: { event: 'required' } },
  { value: 'stage4_in_trip', label: 'Stage 4 — In-trip pulse', needs: { event: 'required' } },
  { value: 'stage5_closeout', label: 'Stage 5 — Closeout (concluded)', needs: { event: 'required' } },
  { value: 'stage6_mythology', label: 'Stage 6 — Mythology (closed)', needs: { event: 'required' } },
]

export function TestHarness({ ritualOptions }: { ritualOptions: RitualOption[] }) {
  const [ritualId, setRitualId] = useState<string>(ritualOptions[0]?.id ?? '')
  const [eventOptions, setEventOptions] = useState<EventOption[]>([])
  const [eventId, setEventId] = useState<string>('')
  const [variant, setVariant] = useState<CallVariant>('stage1_cold_start')
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('preview')
  const [testAddress, setTestAddress] = useState<string>('zkhowes@gmail.com')
  const [result, setResult] = useState<BuildResult | null>(null)
  const [sendStatus, setSendStatus] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const variantSpec = useMemo(
    () => VARIANTS.find((v) => v.value === variant)!,
    [variant]
  )

  useEffect(() => {
    if (!ritualId) return
    listEvents(ritualId).then((evs) => {
      setEventOptions(evs)
      setEventId((curr) => (evs.find((e) => e.id === curr) ? curr : evs[0]?.id ?? ''))
    })
  }, [ritualId])

  function build() {
    if (!ritualId) return
    setSendStatus(null)
    startTransition(async () => {
      const r = await buildPreview({
        variant,
        ritualId,
        eventId: variantSpec.needs.event ? eventId : null,
        recipientUserId: null,
      })
      setResult(r)
    })
  }

  function sendTest() {
    if (!result?.content) return
    setSendStatus('Sending...')
    startTransition(async () => {
      const r = await sendTestEmail({
        variant,
        ritualId,
        eventId: variantSpec.needs.event ? eventId : null,
        recipientUserId: null,
        testAddress,
      })
      setSendStatus(r.ok ? `Sent (${r.resendId?.slice(0, 8)})` : `Failed: ${r.error}`)
    })
  }

  function sendCrew() {
    if (!result?.content) return
    if (
      !confirm(
        `Send to ${result.recipients.length} real crew members? This bypasses rate limits.`
      )
    )
      return
    if (!confirm('Are you really sure? Last chance.')) return
    setSendStatus('Sending to crew...')
    startTransition(async () => {
      const r = await sendToCrew({
        variant,
        ritualId,
        eventId: variantSpec.needs.event ? eventId : null,
        recipientUserId: null,
      })
      setSendStatus(
        r.ok
          ? `Sent to ${r.recipientCount} (${r.resendId?.slice(0, 8)})`
          : `Failed: ${r.error}`
      )
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 320px', gap: '16px', minHeight: '70vh' }}>
      {/* Left — selectors */}
      <aside style={{ borderRight: '1px solid #1f2937', paddingRight: '16px' }}>
        <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', marginBottom: '16px' }}>
          Test harness
        </h2>

        <Field label="Ritual">
          <select
            value={ritualId}
            onChange={(e) => setRitualId(e.target.value)}
            style={selectStyle}
          >
            {ritualOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.eventCount} events · {r.theme})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Variant">
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as CallVariant)}
            style={selectStyle}
          >
            {VARIANTS.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>

        {variantSpec.needs.event ? (
          <Field label="Event">
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              style={selectStyle}
            >
              {eventOptions.length === 0 ? (
                <option value="">No events</option>
              ) : (
                eventOptions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.year} · {e.name} · {e.status}
                  </option>
                ))
              )}
            </select>
          </Field>
        ) : null}

        <button
          onClick={build}
          disabled={pending || !ritualId}
          style={{ ...buttonStyle, marginTop: '16px', width: '100%' }}
        >
          {pending ? 'Building...' : 'Build preview'}
        </button>

        {result?.html ? (
          <>
            <hr style={{ borderColor: '#1f2937', margin: '24px 0' }} />
            <Field label="Recipient mode">
              <select
                value={recipientMode}
                onChange={(e) => setRecipientMode(e.target.value as RecipientMode)}
                style={selectStyle}
              >
                <option value="preview">Preview only</option>
                <option value="test_address">Send to test address</option>
                <option value="real_crew">Send to real crew ({result.recipients.length})</option>
              </select>
            </Field>

            {recipientMode === 'test_address' ? (
              <>
                <Field label="Test address">
                  <input
                    value={testAddress}
                    onChange={(e) => setTestAddress(e.target.value)}
                    style={selectStyle}
                  />
                </Field>
                <button
                  onClick={sendTest}
                  disabled={pending}
                  style={{ ...buttonStyle, marginTop: '8px', width: '100%' }}
                >
                  Send test
                </button>
              </>
            ) : null}

            {recipientMode === 'real_crew' ? (
              <button
                onClick={sendCrew}
                disabled={pending || result.recipients.length === 0}
                style={{ ...buttonStyle, marginTop: '8px', width: '100%', backgroundColor: '#7f1d1d', borderColor: '#991b1b' }}
              >
                Send to crew ({result.recipients.length})
              </button>
            ) : null}

            {sendStatus ? (
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#a3e635' }}>
                {sendStatus}
              </div>
            ) : null}
          </>
        ) : null}
      </aside>

      {/* Center — rendered email */}
      <main style={{ overflow: 'auto' }}>
        {result?.html ? (
          <iframe
            srcDoc={result.html}
            style={{
              width: '100%',
              height: '85vh',
              border: '1px solid #1f2937',
              borderRadius: '4px',
              backgroundColor: 'white',
            }}
            title="email preview"
          />
        ) : (
          <div style={emptyStyle}>
            Pick a ritual + variant and click <strong>Build preview</strong>.
          </div>
        )}
        {result?.error ? (
          <div style={{ color: '#fca5a5', padding: '12px', fontSize: '13px' }}>
            Error: {result.error}
          </div>
        ) : null}
      </main>

      {/* Right — debug context */}
      <aside style={{ borderLeft: '1px solid #1f2937', paddingLeft: '16px', overflow: 'auto', maxHeight: '85vh' }}>
        <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', marginBottom: '12px' }}>
          Debug
        </h2>
        {result?.copy ? (
          <>
            <Section title="Subject">{result.copy.subject}</Section>
            <Section title="Headline">{result.copy.headline}</Section>
            <Section title="Body">{result.copy.body}</Section>
            <Section title="Tokens">
              in {result.copy.inputTokens} · out {result.copy.outputTokens}
            </Section>
            <Section title="Recipients">
              <div style={{ fontSize: '11px', color: '#9ca3af', maxHeight: '120px', overflow: 'auto' }}>
                {result.recipients.length === 0 ? '(none)' : result.recipients.join(', ')}
              </div>
            </Section>
            <Section title="Raw AI">
              <pre style={preStyle}>{result.copy.rawText.slice(0, 600)}</pre>
            </Section>
            <Section title="Content (JSON)">
              <pre style={preStyle}>{JSON.stringify(result.content, null, 2).slice(0, 1500)}</pre>
            </Section>
          </>
        ) : (
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Build a preview to see debug info.</div>
        )}
      </aside>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ fontSize: '12px', color: '#e5e7eb' }}>{children}</div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#0a0a0a',
  color: '#e5e7eb',
  border: '1px solid #374151',
  borderRadius: '4px',
  padding: '8px',
  fontSize: '12px',
  fontFamily: 'monospace',
}
const buttonStyle: React.CSSProperties = {
  backgroundColor: '#1f2937',
  color: '#e5e7eb',
  border: '1px solid #374151',
  borderRadius: '4px',
  padding: '10px 16px',
  fontSize: '12px',
  fontFamily: 'monospace',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}
const emptyStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '85vh',
  color: '#6b7280',
  fontSize: '13px',
  border: '1px dashed #374151',
  borderRadius: '4px',
}
const preStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#9ca3af',
  backgroundColor: '#0a0a0a',
  padding: '8px',
  borderRadius: '4px',
  overflow: 'auto',
  maxHeight: '180px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
}
