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
import type { Stage6MythologyContent } from '../lib/call/content'
import type { AiCopy } from '../lib/ai/call-copy'

export interface Stage6MythologyEmailProps {
  content: Stage6MythologyContent
  copy: AiCopy
}

export function Stage6MythologyEmail({ content, copy }: Stage6MythologyEmailProps) {
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

      {content.recapEvent.coverPhotoUrl ? (
        <CallCard theme={content.ritual.theme}>
          <Img
            src={content.recapEvent.coverPhotoUrl}
            alt={content.recapEvent.name}
            width="100%"
            style={{
              display: 'block',
              borderRadius: '4px',
              maxHeight: '320px',
              objectFit: 'cover',
            }}
          />
          <Text style={{ margin: '12px 0 0', fontSize: '14px', color: t.fgMuted, textAlign: 'center' }}>
            {content.recapEvent.name} · {content.recapEvent.location}
            {content.recapEvent.mvpName ? ` · MVP ${content.recapEvent.mvpName}` : ''}
          </Text>
        </CallCard>
      ) : null}

      <Text style={{ textAlign: 'center', color: t.fgMuted, fontSize: '13px', margin: '16px 0 0' }}>
        {content.ritual.yearsRun} year{content.ritual.yearsRun === 1 ? '' : 's'} strong.
      </Text>

      <div style={{ textAlign: 'center', margin: '32px 0 8px' }}>
        <CallButton theme={content.ritual.theme} href={content.ctaUrl}>
          Start next year →
        </CallButton>
      </div>
    </CallShell>
  )
}

export default Stage6MythologyEmail
