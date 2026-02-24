# Yearout — Claude Code Context

## Project Overview
Yearout is a mobile-first web app that manages the full lifecycle of recurring group adventure trips. It combines trip planning, expense splitting, daily logging, awards, and a hall of fame into one product built around the idea that your annual trip is a mythology worth preserving.

## Infrastructure
- **Repo**: https://github.com/zkhowes/yearout (public)
- **Hosting**: Vercel
- **Domain**: hover.com (TBD)
- **Dev port**: 3003 (`npm run dev`)

## Tech Stack
- **Framework**: Next.js 14, App Router, TypeScript
- **Styling**: Tailwind CSS v3 + CSS variables (for theme system)
- **Animation**: Framer Motion
- **Backend/DB**: Supabase (Postgres, Auth, Storage, Realtime)
- **Icons**: Lucide React
- **Deployment**: Vercel

## Key Architecture Decisions
- App Router (not pages/)
- Mobile-first design — primary target is phone, extended to tablet/desktop
- Theme system applied at the **series level** (not app-wide)
- Four themes: Circuit, Club, Trail, Getaway — each with distinct colors/typography
- App shell is always neutral (white bg, dark text)

## Event Lifecycle
`planning` → `scheduled` → `in_progress` → `closed`

## Design Principles
- Max 3 taps for any core action
- Bottom nav on mobile (max 5 tabs), sidebar on desktop
- No horizontal scrolling
- WCAG AA accessibility minimum

## Folder Conventions
- `app/` — App Router pages and layouts
- `components/` — shared UI components
- `lib/` — utilities, Supabase client, helpers
- `types/` — TypeScript type definitions

## PRD
Full product requirements are in `PRD.md` at the repo root.
