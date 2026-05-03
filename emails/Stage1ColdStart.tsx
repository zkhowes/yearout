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
import type { Stage1ColdStartContent } from '../lib/call/content'
import type { AiCopy } from '../lib/ai/call-copy'

export interface Stage1ColdStartEmailProps {
  content: Stage1ColdStartContent
  copy: AiCopy
}

export function Stage1ColdStartEmail({ content, copy }: Stage1ColdStartEmailProps) {
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

      {content.ritual.tagline ? (
        <CallCard theme={content.ritual.theme}>
          <Text
            style={{
              fontStyle: 'italic',
              color: t.fgMuted,
              margin: 0,
              fontSize: '15px',
            }}
          >
            {content.ritual.tagline}
          </Text>
        </CallCard>
      ) : null}

      <div style={{ textAlign: 'center', margin: '32px 0 8px' }}>
        <CallButton theme={content.ritual.theme} href={content.ctaUrl}>
          Plan the trip →
        </CallButton>
      </div>
    </CallShell>
  )
}

export default Stage1ColdStartEmail
