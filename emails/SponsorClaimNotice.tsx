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

export interface SponsorClaimNoticeProps {
  ritualName: string
  ritualLogoUrl: string | null
  theme: string
  placeholderName: string
  claimedByName: string | null
  claimedByEmail: string
  ritualUrl: string
}

export function SponsorClaimNoticeEmail({
  ritualName,
  ritualLogoUrl,
  theme,
  placeholderName,
  claimedByName,
  claimedByEmail,
  ritualUrl,
}: SponsorClaimNoticeProps) {
  const t = getEmailTheme(theme)
  const subject = `Someone stepped in as ${placeholderName}`

  return (
    <CallShell
      theme={theme}
      preview={subject}
      ritualName={ritualName}
      ritualLogoUrl={ritualLogoUrl}
    >
      <CallHeadline theme={theme}>Someone stepped in.</CallHeadline>
      <CallBody theme={theme}>
        You had {placeholderName} on the roster as a placeholder. {claimedByName ?? 'A new account'} just
        claimed that spot — and from here on, the saga is theirs to write.
      </CallBody>

      <CallCard theme={theme}>
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
          The claim
        </Text>
        <Text style={{ fontSize: '16px', color: t.fg, margin: '0 0 4px', fontWeight: 600 }}>
          {placeholderName} → {claimedByName ?? claimedByEmail}
        </Text>
        <Text style={{ fontSize: '14px', color: t.fgMuted, margin: 0 }}>{claimedByEmail}</Text>
      </CallCard>

      <CallBody theme={theme}>
        If that wasn&apos;t the person you meant, reply to this email and we&apos;ll sort it out by hand. The
        attendance, flights, and expenses that were on the placeholder now belong to them.
      </CallBody>

      <div style={{ textAlign: 'center', margin: '32px 0 8px' }}>
        <CallButton theme={theme} href={ritualUrl}>
          Open the ritual →
        </CallButton>
      </div>
    </CallShell>
  )
}

export default SponsorClaimNoticeEmail
