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
import type { Stage5CloseoutContent } from '../lib/call/content'
import type { AiCopy } from '../lib/ai/call-copy'

export interface Stage5CloseoutEmailProps {
  content: Stage5CloseoutContent
  copy: AiCopy
}

export function Stage5CloseoutEmail({ content, copy }: Stage5CloseoutEmailProps) {
  const t = getEmailTheme(content.event.ritual.theme)

  const balanceLine =
    content.recipientBalanceCents == null
      ? null
      : content.recipientBalanceCents > 0
        ? `Owed back: $${(content.recipientBalanceCents / 100).toFixed(0)}`
        : content.recipientBalanceCents < 0
          ? `Owes: $${Math.abs(content.recipientBalanceCents / 100).toFixed(0)}`
          : 'Settled up'

  return (
    <CallShell
      theme={content.event.ritual.theme}
      preview={copy.subject}
      ritualName={content.event.ritual.name}
      ritualLogoUrl={content.event.ritual.logoUrl}
    >
      <CallHeadline theme={content.event.ritual.theme}>{copy.headline}</CallHeadline>
      <CallBody theme={content.event.ritual.theme}>{copy.body}</CallBody>

      {content.awardsPodium.length > 0 ? (
        <CallCard theme={content.event.ritual.theme}>
          <Text style={{ margin: 0, fontSize: '13px', color: t.fgMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Awards
          </Text>
          {content.awardsPodium.map((p, idx) => (
            <Text key={idx} style={{ margin: '8px 0 0', fontSize: '15px', color: t.fg }}>
              {p.awardName}: <strong>{p.winner ?? 'pending votes'}</strong>
            </Text>
          ))}
        </CallCard>
      ) : null}

      {balanceLine ? (
        <CallCard theme={content.event.ritual.theme}>
          <Text style={{ margin: 0, fontSize: '13px', color: t.fgMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Settlement
          </Text>
          <Text style={{ margin: '8px 0 0', fontSize: '15px', color: t.fg }}>
            {balanceLine}
          </Text>
        </CallCard>
      ) : null}

      <div style={{ textAlign: 'center', margin: '32px 0 8px' }}>
        <CallButton theme={content.event.ritual.theme} href={content.ctaUrl}>
          Settle up →
        </CallButton>
      </div>
    </CallShell>
  )
}

export default Stage5CloseoutEmail
