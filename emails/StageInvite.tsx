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
import type { InvitePlaceholderContent } from '../lib/call/content'
import type { AiCopy } from '../lib/ai/call-copy'

export interface StageInviteEmailProps {
  content: InvitePlaceholderContent
  copy: AiCopy
}

export function StageInviteEmail({ content, copy }: StageInviteEmailProps) {
  const t = getEmailTheme(content.ritual.theme)

  return (
    <CallShell
      theme={content.ritual.theme}
      preview={copy.subject}
      ritualName={content.ritual.name}
      ritualLogoUrl={content.ritual.logoUrl}
    >
      <CallHeadline theme={content.ritual.theme}>{copy.headline}</CallHeadline>
      <CallBody theme={content.ritual.theme}>{copy.body}</CallBody>

      {content.upcomingEvent ? (
        <CallCard theme={content.ritual.theme}>
          <Text
            style={{
              fontFamily: t.fontDisplay,
              fontSize: '12px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: t.fgMuted,
              margin: '0 0 8px',
            }}
          >
            Next on the calendar
          </Text>
          <Text
            style={{
              fontSize: '17px',
              color: t.fg,
              margin: 0,
              fontWeight: 600,
            }}
          >
            {content.upcomingEvent.name}
            {content.upcomingEvent.location ? ` · ${content.upcomingEvent.location}` : ''}
          </Text>
        </CallCard>
      ) : null}

      <div style={{ textAlign: 'center', margin: '32px 0 8px' }}>
        <CallButton theme={content.ritual.theme} href={content.ctaUrl}>
          See the ritual →
        </CallButton>
      </div>

      <Text
        style={{
          fontSize: '13px',
          color: t.fgMuted,
          textAlign: 'center',
          fontStyle: 'italic',
          margin: '16px 0 0',
        }}
      >
        You don&apos;t need an account to look. When you&apos;re ready, step in.
      </Text>
    </CallShell>
  )
}

export default StageInviteEmail
