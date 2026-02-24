# Yearout — Product Requirements Document
**Version:** 1.0  
**Date:** February 2026  
**Status:** Draft  

---

## 1. Vision

Every crew has a trip they talk about all year. Yearout exists to make sure it actually happens — and to make sure it lives forever. We turn annual group adventures into mythology: the lore, the awards, the suffering, the brotherhood. Year after year, stop after stop.

---

## 2. The Problem

Planning recurring group adventure trips is broken:
- Coordination happens in group chats that go nowhere
- Dates never get locked because nobody owns the process
- Memories are scattered across photos apps, Venmo threads, and people's heads
- There is no single place that holds the history, the awards, the lore of a crew's annual ritual
- Nothing exists that treats your trip as a *series* — something with continuity, history, and identity

---

## 3. The Solution

Yearout is a mobile-first web app that manages the full lifecycle of a recurring group adventure trip — from "we should do this again" to a living archive of everything that happened. It combines trip planning, expense splitting, daily logging, awards, and hall of fame into one product built around the idea that your annual trip is not just an event, it's a mythology worth preserving.

---

## 4. Core Philosophy & Principles

### 1. The Call is Sacred
When the trip is confirmed, it's not a calendar invite — it's a summons. Like the Mavericks surf contest, when the call goes out you drop everything. That notification is the signature product moment.

### 2. Seize It or Lose It
Carpe Diem is the soul of Yearout. Life shortens. Schedules fill. The whole product exists to eliminate friction between "we should do this" and "it's booked." Stop chatting. Start going.

### 3. The Ritual Builds the Legend
Every year you show up, you add another chapter. The lore, the awards, the hall of fame — these aren't features, they're the point. Yearout protects and grows the mythology.

### 4. Suffer Together, Remember Forever
The best group experiences involve hardship. The brutal run, the freezing morning, the wipeout on day two. Yearout leans into the suffering and competition. That's what makes the nostalgia so powerful.

### 5. The Crew is the Core
This isn't a travel app with social features. It's a brotherhood app with travel features. The running all-time leaderboard, the inside jokes, the crew that shows up — Yearout honors those bonds.

### 6. Fewest Steps Possible
Every workflow must be ruthlessly simple. If it takes more than 3 taps to complete a core action, we've failed. Usability is a design principle, not an afterthought.

---

## 5. Target Users

### Primary: The Organizer
- Has an existing annual group trip tradition (ski, golf, backpacking, family)
- Frustrated by the coordination overhead every year
- Wants to preserve the memories and lore of their crew
- Likely 28–50, owns the logistics for the group

### Secondary: The Crew Member
- Invited into an existing series
- Wants to participate in voting, see the schedule, log moments, settle expenses
- Less interested in admin, highly interested in the fun parts (awards, HOF, leaderboard)

### Future: The Guide / Planner
- Expert in a particular type of trip (ski resorts, golf courses, backpacking routes)
- Wants to offer their services to crews who need help planning
- Part of the marketplace vision (Phase 2)

---

## 6. App Structure & User Flow

### 6.1 Authentication
- Email/password signup and login
- Invite-only joining for event series (no public discovery in Phase 1)

### 6.2 Dashboard
- List of all series the user belongs to (as owner or member)
- Quick-action to create a new series
- Notifications for pending votes, upcoming events, unsettled expenses

### 6.3 Create a Series
Minimum steps to establish a crew's recurring event:
1. Name the series (e.g. "The Torture Tour")
2. Set the activity type (ski / golf / backpacking / biking / family / other)
3. Choose a theme (Circuit / Club / Trail / Getaway)
4. Optional: tagline, logo (AI-assisted generation), bylaws/motto
5. Invite crew members by email or link

### 6.4 Plan an Event
Each year, one event is created within the series. Planning flow:
1. Host proposes dates, locations, activity (if variable)
2. Crew votes: yes / no / maybe on each proposal
3. Host reviews votes and locks in the date, location, activity — **this triggers The Call**
4. Event moves from `planning` → `scheduled`

### 6.5 The Call
A distinct, high-impact push notification and in-app moment when an event is officially confirmed. Should feel ceremonial — not a standard notification. The signature product moment.

### 6.6 Tour View
The emotional core of the app. Styled like a band tour calendar:
- Upcoming event: prominently featured at top
- Past events: listed chronologically by year with location
- Each past event is a gateway into its archived lore
- Visual design driven by the series theme

### 6.7 Book It (Scheduled State)
- Guided checklist: lodging, travel, lift tickets / tee times / permits
- Smart deep links to relevant booking sites
- Individual crew members can mark their own travel as booked
- Optional: spouse/guest add-ons

### 6.8 In Progress
Active features during the trip:
- **Daily Log**: anyone can post a log entry for the day — text, photos, type (general / result / hall of fame moment)
- **Race/Game Results**: structured result entry (fastest time, lowest score, etc.)
- **Expenses**: add a cost, who paid, split equally or custom — Splitwise-style
- **Hall of Fame**: flag any log entry as a HOF moment; these persist in the series archive forever

### 6.9 Close Out
End-of-event flow:
- Settle expenses: see who owes what, mark as settled
- Give awards: crew nominates and assigns named awards (MVP, Most Suffering, Best Wipeout, etc.)
- Video edit prompt: link to Google Drive or Apple Photos shared album; prompt to create a highlight edit
- Seal the chapter: event moves to `closed` and joins the archive

### 6.10 Series Archive (Past Events)
- Every closed event is permanently accessible
- Shows: dates, location, crew, awards, HOF moments, log highlights
- All-time leaderboard across all events in the series
- Award history: who has won what, how many times

---

## 7. Theme System

The Yearout app shell is always clean, minimal, and neutral. Themes are applied at the **series level** — the Tour view, awards, HOF, and archive take on the series theme.

### Default (App Shell)
Clean, minimal, mobile-first. White background, dark text, no personality — this is the neutral container.

### The Circuit
- Vibe: Band tour poster, grungy, earned, dark
- Colors: Black background, gold accent, cream text
- Typography: Bebas Neue display, IBM Plex Mono body
- Target: Ski crews, hard-charging adventure groups, the Torture Tour types

### The Club
- Vibe: Augusta National, understated luxury, classic
- Colors: Cream background, navy, serif elegance
- Typography: Playfair Display, Lato
- Target: Golf trips, wine country weekenders, cigar-and-whiskey crews

### The Trail
- Vibe: Gear catalog, topographic, earthy, REI meets field journal
- Colors: Off-white, forest green, warm brown
- Typography: Montserrat, Source Sans
- Target: Backpacking, mountain biking, climbing crews

### The Getaway
- Vibe: Warm, bright, inclusive, joyful — needs further development
- Colors: Warm white, orange accent, rounded everything
- Typography: Nunito
- Target: Family vacations, multi-generational trips, casual group travel

---

## 8. Design Requirements

### Mobile First
- Designed for phone; extended to tablet and desktop
- Bottom navigation bar on mobile (max 5 tabs)
- Sidebar navigation on desktop
- No horizontal scrolling

### Simplicity as Innovation
- Maximum 3 taps for any core action
- Progressive disclosure: show only what's needed at each stage
- No feature creep on the mobile view — save complexity for desktop planning views

### Responsive Breakpoints
- Mobile: < 768px (primary design target)
- Tablet: 768px–1024px
- Desktop: > 1024px (richer planning tools, expanded views)

### Accessibility
- WCAG AA minimum
- All interactive elements keyboard accessible
- Sufficient color contrast across all themes

---

## 9. Technical Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR, file-based routing, great DX |
| Styling | Tailwind CSS + CSS variables | Utility-first + theme system |
| Animation | Framer Motion | The Call moment, page transitions |
| Backend/DB | Supabase (Postgres) | Auth, DB, storage, realtime in one |
| Auth | Supabase Auth | Built-in, easy to implement |
| File Storage | Supabase Storage | Photos, logos, media |
| Deployment | Vercel | Zero-config Next.js deployment |
| Icons | Lucide React | Clean, consistent icon set |

---

## 10. Data Model (High Level)

```
User
└── series_members → Series (one user can belong to many series)
                     ├── theme
                     ├── activity_type
                     └── events[]
                           ├── status: planning → scheduled → in_progress → closed
                           ├── proposals[] + votes[]
                           ├── logs[] (daily entries, HOF moments)
                           ├── expenses[] + expense_splits[]
                           └── awards[]
```

---

## 11. Phase 1 Scope (MVP)

The MVP is the full lifecycle for a single crew:

- [ ] Auth (signup, login, invite)
- [ ] Create a series (name, theme, activity, invite crew)
- [ ] Tour view (past events + upcoming)
- [ ] Plan & vote (propose dates/locations, crew votes, host locks)
- [ ] The Call notification
- [ ] Booking checklist
- [ ] Daily log (text + photos)
- [ ] Expense splitting
- [ ] Hall of fame flagging
- [ ] Close out (awards + settle expenses)
- [ ] Series archive (past events, all-time leaderboard, award history)

---

## 12. Phase 2 (Post-MVP)

- Marketplace: guides and planners offer their services to crews
- AI logo generation for series
- Merchandise integration (shirts, stickers based on series theme)
- Video edit automation (integrate with Google Photos / Apple Photos APIs)
- Public series discovery (opt-in)
- Native mobile apps (iOS / Android)
- Activity-specific features (ski run tracking, golf scorecards, trail maps)

---

## 13. Out of Scope (Phase 1)

- Native mobile apps (web only, PWA-ready)
- Actual booking / travel agent functionality (deep links only)
- Video storage (link out to Google Drive / Apple Photos)
- Social discovery / public feeds
- Marketplace / guides

---

## 14. Success Metrics (Phase 1)

- A crew can go from zero to a confirmed event in under 10 minutes
- Every core action completable in 3 taps or fewer on mobile
- At least one closed event per series (full lifecycle completed)
- Users return to the Tour view between events (the archive has pull)

---

## 15. Open Questions

- [ ] What does The Getaway theme look like in more detail?
- [ ] How does AI logo generation work — which model/API?
- [ ] What's the exact UX of The Call — full-screen takeover? Special sound?
- [ ] Do we support real-time expense updates during the trip (Supabase realtime)?
- [ ] How do we handle crew members who don't have the app yet (SMS invites)?
- [ ] What activity-specific fields matter most first — ski run times? Golf scorecards?