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
import type { Stage3aCommitContent } from '../lib/call/content'
import type { AiCopy } from '../lib/ai/call-copy'

export interface Stage3aCommitEmailProps {
  content: Stage3aCommitContent
  copy: AiCopy
}

export function Stage3aCommitEmail({ content, copy }: Stage3aCommitEmailProps) {
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

      {content.committedNames.length > 0 ? (
        <CallCard theme={content.event.ritual.theme}>
          <Text style={{ margin: 0, fontSize: '13px', color: t.fgMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Already in
          </Text>
          <Text style={{ margin: '8px 0 0', fontSize: '15px', color: t.fg }}>
            {content.committedNames.slice(0, 8).join(' · ')}
            {content.committedNames.length > 8 ? ` + ${content.committedNames.length - 8} more` : ''}
          </Text>
        </CallCard>
      ) : null}

      <div style={{ textAlign: 'center', margin: '32px 0 8px' }}>
        <CallButton theme={content.event.ritual.theme} href={content.ctaUrl}>
          Commit →
        </CallButton>
      </div>
    </CallShell>
  )
}

export default Stage3aCommitEmail
