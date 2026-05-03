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
import type { Stage3bPackListContent } from '../lib/call/content'
import type { AiCopy } from '../lib/ai/call-copy'

export interface Stage3bPackListEmailProps {
  content: Stage3bPackListContent
  copy: AiCopy
}

export function Stage3bPackListEmail({ content, copy }: Stage3bPackListEmailProps) {
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
          {content.daysUntil} day{content.daysUntil === 1 ? '' : 's'} out · suggested pack list
        </Text>
        {content.packListItems.map((item, idx) => (
          <Text key={idx} style={{ margin: '8px 0 0', fontSize: '15px', color: t.fg }}>
            ☐ {item}
          </Text>
        ))}
      </CallCard>

      <div style={{ textAlign: 'center', margin: '32px 0 8px' }}>
        <CallButton theme={content.event.ritual.theme} href={content.ctaUrl}>
          Review your pack list →
        </CallButton>
      </div>
    </CallShell>
  )
}

export default Stage3bPackListEmail
