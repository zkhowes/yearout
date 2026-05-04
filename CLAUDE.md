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

> Last updated: 2026-05-03 (evening)

### Backlog
- [ ] Trip templates (pre-populated checklists, pack lists, result fields)
- [ ] The Call — Stage 3: Full-screen in-app takeover experience
- [ ] Smart Share Links with AI motivational copy
- [ ] Nearest airport helper + Google Flights deep link
- [ ] Sponsor photo/nickname override UI for members
- [ ] Core Crew badge display throughout app
- [ ] Merch tab — Phase 2 placeholder page
- [ ] Ritual archive export
- [ ] Admin dashboard — stall detection
- [ ] Admin dashboard — CSV seed import (Torture Tour history)
- [ ] **ZKH-23** Stats → Lore generalization
- [ ] **ZKH-24** Pack list UI (Stage 3b email upgrade)
- [ ] **ZKH-25** Cross-event leaderboard aggregations

### Up Next
- [ ] Daily Itinerary UI — *schema exists, needs create/edit/display*
- [ ] Crew page — roster, Core Crew badges, all-time leaderboard
- [ ] About page — bylaws, motto, founding year, activity type
- [ ] Cross-event Lore tab — HOF moments browser across all years
- [ ] DNS setup for `send.yearout.zkhowes.fun` (verify in Resend, add MX/SPF/DKIM/DMARC at Hover)

### In Progress

### Done
- [x] **Admin Test Harness — editable copy + richer recipient modes** — debug pane now edits Subject/Headline/Body inline with a re-render-without-AI button; recipient modes expanded to Attendees / Core crew / Select crew members; new `sendCustom` action carries `copyOverride` for hand-edited sends, tags Resend with `audience` + `edited` flags
- [x] **The Call — Stage 6 chapter-number hallucination fix** — system prompt now forbids numbered "Chapter N" framing and clarifies the years-run figure is duration, not an index; Stage 6 user prompt drops "chapter" wording in favor of "year"/"trip" and tells the model the actual event name and year to use
- [x] **The Call — Stage 6 hallucination fix** — fact-contract added to system prompt forbidding any proper noun outside the Context block; Stage 6 now feeds real prior chapters from DB (`Stage6MythologyContent.priorChapters`); `temperature: 0.6`, `max_tokens: 320` on Haiku 4.5
- [x] **The Skald** (persona) — guide character replacing all user-facing "AI-generated" copy; voice = memento mori sage; `lib/skald/`, `<Rune>`, `<SkaldSpeaks>`; reused across Settings rewrite, The Call loaders, ritual creation, bulk history
- [x] **ZKH-21** Cold-start onboarding helper — two-door `/new` (named vs help); helped flow is multi-turn Skald conversation that emits candidate names organically; reuses existing `/api/ritual/infer` with new optional `context` field; new `/api/ritual/skald-converse` endpoint with prompt caching + per-phase fallbacks
- [x] **ZKH-22** Ongoing-ritual bulk backfill — `/[ritualSlug]/history/new` chooser (grid vs Skald-conversational); spreadsheet-style `<HistoryGrid>` with TSV/CSV paste; `/api/ritual/parse-history` extracts structured rows from freeform; new `bulkHistoryEnterEvents` server action with pre-flight unique-constraint check; entry points on done screen, empty Tour view, and Settings
- [x] **The Call email pipeline** — 8-variant matrix (Stage 1 cold/ongoing, 2, 3, 3a, 3b, 4, 5, 6) wired to Resend, theme-aware React Email templates, AI copy per variant via Claude Haiku
- [x] **Sponsor "Send the Summons" page** — `/[ritualSlug]/the-call`, drafts queue, preview/send/cancel/snooze, rate-limit meter
- [x] **Admin Test Harness** — `/admin/the-call` with ritual/event/variant selector, live preview iframe, dry-run + send-to-test + send-to-crew modes
- [x] **Admin Email History** — `/admin/email-history` browsable log of all `call_sends`
- [x] **Admin auth simplified** — removed `ADMIN_PASSWORD` second factor + `/admin/login` page + `/api/admin/verify` route. `/admin/*` now authorized solely by `ADMIN_EMAILS` allowlist match against the OAuth session email
- [x] **Email allowlist** — `ADMIN_EMAILS` env var gates `/admin` routes
- [x] **Cron scaffolding** — `/api/cron/send-calls` daily 07:00 drafts upcoming Calls into `call_schedule` for sponsor approval
- [x] Stage 2 + Stage 3 emails fire from existing `createCall` / `sendTheCall` flows
- [x] Award cleanup — dedup torture tour defs, prevent duplicate award names, cap already-happened auto-link at 3
- [x] Award management — full CRUD in settings, per-event linking via join table, auto-link on event creation
- [x] Concluded state — auto-transition from in_progress when endDate passes, crew tiles, close-out wizard skip
- [x] Auth — Google OAuth (Auth.js v5)
- [x] Ritual creation (AI-powered inference, theme, awards, invite)
- [x] Event creation — three modes (The Call / Already Confirmed / Already Happened)
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
