import {
  Body,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import { getEmailTheme, type EmailTheme } from '../../lib/email/theme'

export interface CallShellProps {
  theme: EmailTheme | string | null | undefined
  preview: string
  ritualName: string
  ritualLogoUrl?: string | null
  /** "boys" → "Reply all — get the boys talking", "crew" → neutral */
  vocative?: 'boys' | 'crew' | 'ladies' | 'team'
  appUrl?: string
  children: React.ReactNode
}

export function CallShell({
  theme,
  preview,
  ritualName,
  ritualLogoUrl,
  vocative = 'crew',
  appUrl = 'https://yearout.zkhowes.fun',
  children,
}: CallShellProps) {
  const t = getEmailTheme(theme)

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <Font
          fontFamily={t.fontDisplay.split(',')[0].replace(/"/g, '')}
          fallbackFontFamily="sans-serif"
          webFont={{ url: t.fontDisplayUrl, format: 'woff2' }}
          fontWeight={t.fontDisplayWeight}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: t.bg,
          color: t.fg,
          fontFamily: t.fontBody,
          margin: 0,
          padding: '32px 16px',
        }}
      >
        <Container
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            backgroundColor: t.bg,
          }}
        >
          {/* Header — ritual identity */}
          <Section style={{ paddingBottom: '24px', textAlign: 'center' }}>
            {ritualLogoUrl ? (
              <Img
                src={ritualLogoUrl}
                alt={ritualName}
                width="80"
                height="80"
                style={{ display: 'inline-block', borderRadius: '8px' }}
              />
            ) : null}
            <Text
              style={{
                fontFamily: t.fontDisplay,
                fontSize: '14px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: t.fgMuted,
                margin: '12px 0 0',
              }}
            >
              The Call · {ritualName}
            </Text>
          </Section>

          {/* Body — variant content */}
          <Section>{children}</Section>

          {/* Footer — Reply-All invitation + brand */}
          <Hr style={{ borderColor: t.border, margin: '40px 0 16px' }} />
          <Section style={{ textAlign: 'center' }}>
            <Text
              style={{
                fontSize: '13px',
                color: t.fgMuted,
                margin: '0 0 8px',
                fontStyle: 'italic',
              }}
            >
              Reply all — get the {vocative} talking.
            </Text>
            <Text
              style={{
                fontFamily: t.fontDisplay,
                fontSize: '11px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: t.fgMuted,
                margin: '16px 0 0',
              }}
            >
              <a
                href={appUrl}
                style={{ color: t.accent, textDecoration: 'none' }}
              >
                Yearout
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

/** Standard CTA button — used across all templates. */
export function CallButton({
  theme,
  href,
  children,
}: {
  theme: EmailTheme | string | null | undefined
  href: string
  children: React.ReactNode
}) {
  const t = getEmailTheme(theme)
  return (
    <a
      href={href}
      style={{
        display: 'inline-block',
        backgroundColor: t.accent,
        color: t.accentFg,
        padding: '14px 28px',
        borderRadius: '6px',
        textDecoration: 'none',
        fontFamily: t.fontDisplay,
        fontSize: '15px',
        fontWeight: t.fontDisplayWeight,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </a>
  )
}

/** Headline — themed display text. */
export function CallHeadline({
  theme,
  children,
}: {
  theme: EmailTheme | string | null | undefined
  children: React.ReactNode
}) {
  const t = getEmailTheme(theme)
  return (
    <Text
      style={{
        fontFamily: t.fontDisplay,
        fontSize: '32px',
        lineHeight: '1.1',
        color: t.fg,
        margin: '0 0 16px',
        fontWeight: t.fontDisplayWeight,
      }}
    >
      {children}
    </Text>
  )
}

/** Body paragraph. */
export function CallBody({
  theme,
  children,
}: {
  theme: EmailTheme | string | null | undefined
  children: React.ReactNode
}) {
  const t = getEmailTheme(theme)
  return (
    <Text
      style={{
        fontSize: '16px',
        lineHeight: '1.6',
        color: t.fg,
        margin: '0 0 16px',
      }}
    >
      {children}
    </Text>
  )
}

/** Surface card — for nested data like vote tallies, podiums, balances. */
export function CallCard({
  theme,
  children,
}: {
  theme: EmailTheme | string | null | undefined
  children: React.ReactNode
}) {
  const t = getEmailTheme(theme)
  return (
    <Section
      style={{
        backgroundColor: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: '8px',
        padding: '20px',
        margin: '16px 0',
      }}
    >
      {children}
    </Section>
  )
}
