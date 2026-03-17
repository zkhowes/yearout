# Yearout — Claude Code Context

## Project Overview
Yearout is a mobile-first web app that manages the full lifecycle of recurring group adventure trips. It combines trip planning, expense splitting, daily logging, awards, and a hall of fame into one product built around the idea that your annual trip is a mythology worth preserving.

## Infrastructure
- **Repo**: https://github.com/zkhowes/yearout (public)
- **Hosting**: Vercel
- **Domain**: `yearout.zkhowes.fun` — subdomain on hover.com (CNAME to Vercel)
- **URL structure**: `yearout.zkhowes.fun/[series-slug]` e.g. `/torturetour`
- **Dev port**: 3003 (`npm run dev`)

## Key Terminology
- **Ritual** = the top-level product concept (a recurring annual tradition). "The Torture Tour is a Ritual."
- **The Circuit** = a visual theme (dark, gold, ski/adventure) — NOT the same as the product concept
- **Event** = a single year's instance within a Ritual
- **Sponsor** = permanent admin of a Ritual

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

## Kanban

> Last updated: 2026-03-17

### Backlog
- [ ] Trip templates (pre-populated checklists, pack lists, result fields)
- [ ] The Call — Stage 1: AI-generated summons (Claude API + Resend)
- [ ] The Call — Stage 3: Full-screen takeover experience
- [ ] The Call — Stage 3a: Commit reminder nudges
- [ ] Smart Share Links with AI motivational copy
- [ ] Pack list UI (checklist per crew member)
- [ ] Nearest airport helper + Google Flights deep link
- [ ] Sponsor photo/nickname override UI for members
- [ ] Core Crew badge display throughout app
- [ ] Email delivery integration (Resend + React Email)
- [ ] Merch tab — Phase 2 placeholder page
- [ ] Ritual archive export
- [ ] Admin dashboard — stall detection
- [ ] Admin dashboard — CSV seed import (Torture Tour history)

### Up Next
- [ ] Daily Itinerary UI — *schema exists, needs create/edit/display*
- [ ] Crew page — roster, Core Crew badges, all-time leaderboard
- [ ] About page — bylaws, motto, founding year, activity type
- [ ] Cross-event Lore tab — HOF moments browser across all years

### In Progress

### Done
- [x] Concluded state — auto-transition from in_progress when endDate passes, crew tiles, close-out wizard skip
- [x] Auth — Google OAuth (Auth.js v5)
- [x] Ritual creation (AI-powered inference, theme, awards, invite)
- [x] Event creation — two modes (The Call / Already Confirmed)
- [x] The Call — Stage 2: date/location voting with AI location cards
- [x] The Call — Stage 3: Send The Call (best fit / all or none, AI event naming)
- [x] Planning state — structured voting + sponsor confirmation
- [x] Scheduled state — commitment board, booking status tracking
- [x] In Progress state — Lore, Stats, Expenses tabs
- [x] Close Out — 3-step wizard (expenses, award voting, seal)
- [x] Closed state — archive card with awards podium
- [x] Theme system (Circuit, Club, Trail, Getaway)
- [x] Tour View — event history table
- [x] Expense splitting with settlement math
- [x] Award voting (2 votes per award, no self-vote)
- [x] Lore entries with Hall of Fame flagging
- [x] Activity results logging
- [x] Super Admin dashboard (analytics, search, data)
- [x] Vercel deployment pipeline
- [x] Info carousel — countdown, weather/snow, AI tips, peer pressure nudges
- [x] In-progress improvements — live banner, day count fix, flight board, itinerary + hype carousel cards

## PRD
Full product requirements are in `PRD.md` at the repo root.
