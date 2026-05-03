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
import type { Stage2VoteContent } from '../lib/call/content'
import type { AiCopy } from '../lib/ai/call-copy'

export interface Stage2VoteEmailProps {
  content: Stage2VoteContent
  copy: AiCopy
}

export function Stage2VoteEmail({ content, copy }: Stage2VoteEmailProps) {
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
        <Text style={{ margin: 0, fontSize: '14px', color: t.fg }}>
          <strong>{content.dateOptionsCount}</strong> date option
          {content.dateOptionsCount === 1 ? '' : 's'} ·{' '}
          <strong>{content.locationOptionsCount}</strong> location option
          {content.locationOptionsCount === 1 ? '' : 's'}
        </Text>
        <Text
          style={{ margin: '8px 0 0', fontSize: '13px', color: t.fgMuted }}
        >
          {content.votesSoFar} vote{content.votesSoFar === 1 ? '' : 's'} cast so far.
        </Text>
      </CallCard>

      <div style={{ textAlign: 'center', margin: '32px 0 8px' }}>
        <CallButton theme={content.event.ritual.theme} href={content.ctaUrl}>
          Cast your votes →
        </CallButton>
      </div>
    </CallShell>
  )
}

export default Stage2VoteEmail
