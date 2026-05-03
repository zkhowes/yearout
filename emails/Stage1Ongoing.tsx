import * as React from 'react'
import { Img, Text } from '@react-email/components'
import {
  CallShell,
  CallButton,
  CallHeadline,
  CallBody,
  CallCard,
} from './components/CallShell'
import { getEmailTheme } from '../lib/email/theme'
import type { Stage1OngoingContent } from '../lib/call/content'
import type { AiCopy } from '../lib/ai/call-copy'

export interface Stage1OngoingEmailProps {
  content: Stage1OngoingContent
  copy: AiCopy
}

export function Stage1OngoingEmail({ content, copy }: Stage1OngoingEmailProps) {
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

      {content.hofLore?.mediaUrl ? (
        <CallCard theme={content.ritual.theme}>
          <Img
            src={content.hofLore.mediaUrl}
            alt="Hall of Fame moment"
            width="100%"
            style={{
              display: 'block',
              borderRadius: '4px',
              maxHeight: '320px',
              objectFit: 'cover',
            }}
          />
          {content.hofLore.content ? (
            <Text
              style={{
                fontStyle: 'italic',
                color: t.fgMuted,
                fontSize: '14px',
                margin: '12px 0 0',
              }}
            >
              {content.hofLore.content.slice(0, 140)}
            </Text>
          ) : null}
        </CallCard>
      ) : null}

      {content.lastEvent ? (
        <Text
          style={{
            color: t.fgMuted,
            fontSize: '13px',
            textAlign: 'center',
            margin: '16px 0 0',
          }}
        >
          Last chapter: {content.lastEvent.name} · {content.lastEvent.location}
          {content.lastMvp ? ` · MVP ${content.lastMvp.displayName}` : ''}
        </Text>
      ) : null}

      <div style={{ textAlign: 'center', margin: '32px 0 8px' }}>
        <CallButton theme={content.ritual.theme} href={content.ctaUrl}>
          Plan the next chapter →
        </CallButton>
      </div>
    </CallShell>
  )
}

export default Stage1OngoingEmail
