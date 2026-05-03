// Email theme tokens — mirror app/globals.css themes as inline-friendly values.
// Email clients can't reliably resolve CSS variables, so each value is a plain
// string that React Email <style> attributes can consume directly.

export type EmailTheme = 'circuit' | 'club' | 'trail' | 'getaway' | 'default'

export interface EmailThemeTokens {
  bg: string
  fg: string
  fgMuted: string
  border: string
  surface: string
  accent: string
  accentFg: string
  fontDisplay: string
  fontBody: string
  fontDisplayUrl: string
  fontBodyUrl: string
  fontDisplayWeight: number
}

export const emailTheme: Record<EmailTheme, EmailThemeTokens> = {
  default: {
    bg: '#ffffff',
    fg: '#111111',
    fgMuted: '#6b7280',
    border: '#e5e7eb',
    surface: '#f9fafb',
    accent: '#111111',
    accentFg: '#ffffff',
    fontDisplay: 'Inter, system-ui, sans-serif',
    fontBody: 'Inter, system-ui, sans-serif',
    fontDisplayUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
    fontBodyUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap',
    fontDisplayWeight: 700,
  },
  circuit: {
    bg: '#0a0a0a',
    fg: '#f5f0e0',
    fgMuted: '#a89a78',
    border: '#2a2a2a',
    surface: '#141414',
    accent: '#c9a84c',
    accentFg: '#0a0a0a',
    fontDisplay: '"Bebas Neue", Impact, sans-serif',
    fontBody: '"IBM Plex Mono", Menlo, monospace',
    fontDisplayUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
    fontBodyUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap',
    fontDisplayWeight: 400,
  },
  club: {
    bg: '#faf7f0',
    fg: '#1a2744',
    fgMuted: '#6b7a99',
    border: '#ddd6c0',
    surface: '#f2eddf',
    accent: '#1a2744',
    accentFg: '#faf7f0',
    fontDisplay: '"Playfair Display", Georgia, serif',
    fontBody: 'Lato, "Helvetica Neue", sans-serif',
    fontDisplayUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap',
    fontBodyUrl: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
    fontDisplayWeight: 700,
  },
  trail: {
    bg: '#f7f4ee',
    fg: '#2d2a1e',
    fgMuted: '#7a7060',
    border: '#d4cbb8',
    surface: '#ede8dc',
    accent: '#2d5a3d',
    accentFg: '#f7f4ee',
    fontDisplay: 'Montserrat, system-ui, sans-serif',
    fontBody: '"Source Sans 3", system-ui, sans-serif',
    fontDisplayUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&display=swap',
    fontBodyUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap',
    fontDisplayWeight: 700,
  },
  getaway: {
    bg: '#fffbf5',
    fg: '#1f1f1f',
    fgMuted: '#888888',
    border: '#f0e4d0',
    surface: '#fef6ea',
    accent: '#f06c2a',
    accentFg: '#ffffff',
    fontDisplay: 'Nunito, system-ui, sans-serif',
    fontBody: 'Nunito, system-ui, sans-serif',
    fontDisplayUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@600;800&display=swap',
    fontBodyUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600&display=swap',
    fontDisplayWeight: 800,
  },
}

export function getEmailTheme(theme: string | null | undefined): EmailThemeTokens {
  if (!theme) return emailTheme.default
  return emailTheme[theme as EmailTheme] ?? emailTheme.default
}
