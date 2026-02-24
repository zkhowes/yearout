# Yearout — Claude Code Context

## Project Overview
Yearout is a mobile-first web app that manages the full lifecycle of recurring group adventure trips. It combines trip planning, expense splitting, daily logging, awards, and a hall of fame into one product built around the idea that your annual trip is a mythology worth preserving.

## Infrastructure
- **Repo**: https://github.com/zkhowes/yearout (public)
- **Hosting**: Vercel
- **Domain**: `yearout.zkhowes.fun` — subdomain on hover.com (CNAME to Vercel)
- **URL structure**: `yearout.zkhowes.fun/[series-slug]` e.g. `/torturetour`
- **Dev port**: 3003 (`npm run dev`)

## Tech Stack
- **Framework**: Next.js 14, App Router, TypeScript
- **Styling**: Tailwind CSS v3 + CSS variables (for theme system)
- **Animation**: Framer Motion
- **Database**: Neon (serverless Postgres)
- **ORM**: Drizzle ORM
- **Auth**: Auth.js v5 (NextAuth) — Google + Apple OAuth; Neon/Postgres adapter
- **File Storage**: Vercel Blob (photos, logos, media)
- **Email**: Resend + React Email
- **AI**: Claude API (Anthropic) — Stage 1 quote generation, motivational copy
- **Cron**: Vercel Cron Jobs (Stage 1 Call auto-trigger)
- **Icons**: Lucide React
- **Deployment**: Vercel

## Key Architecture Decisions
- App Router (not pages/)
- Mobile-first — primary target is phone, extended to tablet/desktop
- Theme system applied at the **series level** (not app-wide)
- Four themes: Circuit, Club, Trail, Getaway — each with distinct colors/typography
- App shell is always neutral (white bg, dark text)
- No Supabase — replaced by Neon + Auth.js + Vercel Blob for a cleaner, unified stack

## Event Lifecycle
`planning` → `scheduled` → `in_progress` → `closed`

## Design Principles
- Max 3 taps for any core action
- Bottom nav on mobile: About | Crew | Lore | Merch
- Sidebar on desktop
- No horizontal scrolling
- WCAG AA accessibility minimum

## Folder Conventions
- `app/` — App Router pages and layouts
- `components/` — shared UI components
- `lib/` — utilities, Neon/Drizzle client, helpers
- `types/` — TypeScript type definitions
- `db/` — Drizzle schema and migrations

## PRD
Full product requirements are in `PRD.md` at the repo root.
