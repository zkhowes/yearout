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

/** Small uppercase label above each option group. */
function GroupLabel({
  theme,
  children,
}: {
  theme: string | null | undefined
  children: React.ReactNode
}) {
  const t = getEmailTheme(theme)
  return (
    <Text
      style={{
        margin: '0 0 10px',
        fontSize: '11px',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: t.fgMuted,
      }}
    >
      {children}
    </Text>
  )
}

export function Stage2VoteEmail({ content, copy }: Stage2VoteEmailProps) {
  const theme = content.event.ritual.theme
  const t = getEmailTheme(theme)

  return (
    <CallShell
      theme={theme}
      preview={copy.subject}
      ritualName={content.event.ritual.name}
      ritualLogoUrl={content.event.ritual.logoUrl}
    >
      <CallHeadline theme={theme}>{copy.headline}</CallHeadline>
      <CallBody theme={theme}>{copy.body}</CallBody>

      {/* The options themselves — readable without clicking through. */}
      {content.dateOptions.length > 0 && (
        <CallCard theme={theme}>
          <GroupLabel theme={theme}>
            {content.dateOptions.length === 1 ? 'The date' : 'The dates'}
          </GroupLabel>
          {content.dateOptions.map((d, i) => (
            <Text
              key={d.id}
              style={{
                margin: i === 0 ? '0' : '8px 0 0',
                fontSize: '17px',
                lineHeight: 1.4,
                color: t.fg,
              }}
            >
              {d.label}
            </Text>
          ))}
        </CallCard>
      )}

      {content.locationOptions.length > 0 && (
        <CallCard theme={theme}>
          <GroupLabel theme={theme}>
            {content.locationOptions.length === 1
              ? 'The place'
              : 'The places'}
          </GroupLabel>
          {content.locationOptions.map((l, i) => (
            <React.Fragment key={l.id}>
              <Text
                style={{
                  margin: i === 0 ? '0' : '12px 0 0',
                  fontSize: '17px',
                  lineHeight: 1.4,
                  color: t.fg,
                }}
              >
                {l.name}
              </Text>
              {l.priorYears.length > 0 && (
                <Text
                  style={{
                    margin: '2px 0 0',
                    fontSize: '12px',
                    lineHeight: 1.4,
                    color: t.fgMuted,
                  }}
                >
                  {l.priorYears.length === 1
                    ? `You were here in ${l.priorYears[0]}.`
                    : `You've been here ${l.priorYears.length} times — ${l.priorYears
                        .slice(0, 4)
                        .join(', ')}.`}
                </Text>
              )}
            </React.Fragment>
          ))}
        </CallCard>
      )}

      <Text
        style={{
          margin: '16px 0 0',
          fontSize: '13px',
          textAlign: 'center',
          color: t.fgMuted,
        }}
      >
        {content.votesSoFar === 0
          ? 'No votes yet. Be the one who starts it.'
          : `${content.votesSoFar} vote${
              content.votesSoFar === 1 ? '' : 's'
            } cast so far.`}
      </Text>

      <div style={{ textAlign: 'center', margin: '24px 0 8px' }}>
        <CallButton theme={theme} href={content.ctaUrl}>
          Cast your votes →
        </CallButton>
      </div>
    </CallShell>
  )
}

export default Stage2VoteEmail
