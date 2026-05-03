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
import type { Stage4InTripContent } from '../lib/call/content'
import type { AiCopy } from '../lib/ai/call-copy'

export interface Stage4InTripEmailProps {
  content: Stage4InTripContent
  copy: AiCopy
}

export function Stage4InTripEmail({ content, copy }: Stage4InTripEmailProps) {
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
        <Text style={{ margin: 0, fontSize: '13px', color: t.fgMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Day {content.dayOfTrip} of {content.totalDays}
          {content.todayThemeName ? ` · ${content.todayThemeName}` : ''}
        </Text>
        {content.expenseRunningTotalCents > 0 ? (
          <Text style={{ margin: '12px 0 0', fontSize: '15px', color: t.fg }}>
            Running expenses: ${(content.expenseRunningTotalCents / 100).toFixed(0)}
          </Text>
        ) : null}
        <Text style={{ margin: '4px 0 0', fontSize: '14px', color: t.fgMuted }}>
          {content.recentLoreCount} lore entr{content.recentLoreCount === 1 ? 'y' : 'ies'} so far
        </Text>
      </CallCard>

      <div style={{ textAlign: 'center', margin: '32px 0 8px' }}>
        <CallButton theme={content.event.ritual.theme} href={content.ctaUrl}>
          Drop a memory →
        </CallButton>
      </div>
    </CallShell>
  )
}

export default Stage4InTripEmail
