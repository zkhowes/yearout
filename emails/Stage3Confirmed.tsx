import * as React from 'react'
import { Text } from '@react-email/components'
import {
  CallShell,
  CallButton,
  CallHeadline,
  CallBody,
  CallCard,
} from './components/CallShell'
import { getEmailTheme } from '../lib/email/theme'
import type { Stage3ConfirmedContent } from '../lib/call/content'
import type { AiCopy } from '../lib/ai/call-copy'

function fmtDateRange(start: Date | null, end: Date | null): string {
  if (!start) return 'TBD'
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (!end || start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-US', opts)
  }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`
}

export interface Stage3ConfirmedEmailProps {
  content: Stage3ConfirmedContent
  copy: AiCopy
}

export function Stage3ConfirmedEmail({ content, copy }: Stage3ConfirmedEmailProps) {
  const t = getEmailTheme(content.event.ritual.theme)

  return (
    <CallShell
      theme={content.event.ritual.theme}
      preview={copy.subject}
      ritualName={content.event.ritual.name}
      ritualLogoUrl={content.event.ritual.logoUrl}
    >
      <CallHeadline theme={content.event.ritual.theme}>{copy.headline}</CallHeadline>
      <CallBody theme={content.event.ritual.theme}>{copy.body}</CallBody>

      <CallCard theme={content.event.ritual.theme}>
        <Text style={{ margin: 0, fontSize: '20px', color: t.fg, fontFamily: t.fontDisplay }}>
          {content.event.name}
        </Text>
        <Text style={{ margin: '6px 0 0', fontSize: '14px', color: t.fgMuted }}>
          {content.event.location}
        </Text>
        <Text style={{ margin: '4px 0 0', fontSize: '14px', color: t.fgMuted }}>
          {fmtDateRange(content.event.startDate, content.event.endDate)}
        </Text>
      </CallCard>

      <CallCard theme={content.event.ritual.theme}>
        <Text style={{ margin: 0, fontSize: '14px', color: t.fg }}>
          Commitment board:{' '}
          <strong>
            {content.committedCount} of {content.totalAttendees}
          </strong>{' '}
          locked in
        </Text>
        {content.airportHint ? (
          <Text style={{ margin: '8px 0 0', fontSize: '13px', color: t.fgMuted }}>
            ✈️ {content.airportHint}
          </Text>
        ) : null}
      </CallCard>

      <div style={{ textAlign: 'center', margin: '32px 0 8px' }}>
        <CallButton theme={content.event.ritual.theme} href={content.ctaUrl}>
          Lock in your spot →
        </CallButton>
      </div>
    </CallShell>
  )
}

export default Stage3ConfirmedEmail
