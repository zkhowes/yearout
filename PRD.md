# Yearout — Product Requirements Document
**Version:** 1.4
**Date:** February 2026
**Status:** Draft

---

## 0. Naming Conventions

| Term | Definition |
|---|---|
| **Circuit** | The top-level product concept — a recurring group adventure tradition. "The Torture Tour is a Circuit." Used in UI, marketing, and data model. |
| **The Circuit** | A specific visual theme (dark, grungy, ski/adventure crews). Distinct from the product concept despite sharing the word. |
| **Event** | A single year's instance within a Circuit (e.g. "TT Whistler 2025") |
| **Sponsor** | Permanent admin of a Circuit |
| **Organizer** | Per-event role, designated by Sponsor |
| **Crew** | All participants in a Circuit |
| **Core Crew** | Founding members designation |
| **Lore** | Hall of Fame moments and memories — per event and cross-circuit |

> **Note**: "Circuit" and "The Circuit" (theme) coexist deliberately. Context makes them distinct — "create a Circuit" vs "choose The Circuit theme."
> **Rename pending**: The current PRD draft uses "Series" throughout. A full rename to "Circuit" will be applied at the start of the build phase.

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

### Primary: The Sponsor / Organizer
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

## 5.5 Roles & Permissions

### Sponsor
- The person who creates the series in the app
- Permanent series-level admin — cannot be transferred
- Designates an Organizer for each event (can designate themselves)
- Can manage crew membership, series settings, theme, and awards definition
- The Sponsor role is sacred: they are the keeper of the mythology

### Organizer
- Designated per-event by the Sponsor
- The Organizer role can rotate year to year (required for some series, optional for others)
- Owns the planning flow for their event: proposes dates, locations, activity
- Triggers The Call when locking in the event
- Manages the daily itinerary during the event
- Initiates Close Out

### Crew Member
- Standard participant role
- Can vote on proposals, log entries, add expenses, flag HOF moments, give and receive awards
- Cannot modify series settings or trigger The Call

### Core Crew (designation)
- An optional badge applied to founding members of a series
- Tracks who has been there from the beginning
- Displayed on profiles and the series archive
- Example: The Torture Tour has a Core Crew of original members who've been skiing together since 2009

---

## 6. App Structure & User Flow

### 6.1 Authentication
- **Google OAuth** and **Apple Sign In** are the primary auth methods — no username/password for end users
- Supabase Auth handles both natively
- Invite-only joining for event series (no public discovery in Phase 1)
- A separate **Super Admin** role exists outside of Supabase Auth for internal platform management (see Section 6.11)

### 6.2 Dashboard
- List of all series the user belongs to (as Sponsor, Organizer, or Crew Member)
- Quick-action to create a new series
- Notifications for pending votes, upcoming events, unsettled expenses, and Call alerts
- Unacknowledged Stage 3 Calls trigger a full-screen takeover on next app open

### 6.3 Trip Templates
Yearout provides first-party templates that pre-configure checklist items, pack lists, result fields, booking links, and suggested itinerary themes for each activity type. In Phase 2, Guides can create and publish custom templates.

**Phase 1 templates:**
| Template | Theme fit | Default result fields | Notes |
|---|---|---|---|
| Ski / Snowboarding | Circuit | Speed, skier cross wins, vertical feet | Lift ticket links, Powder Alliance |
| Golf Trip | Club | Score, skins won, longest drive | Tee time links |
| Mountain Biking | Trail | Fastest segment, elevation, wipeouts | Trail map links |
| Fishing Trip | Trail | Biggest catch, total count, species | License/permit links |
| Backpacking Trip | Trail | Miles hiked, elevation gain, summits | Permit links, AllTrails |
| Family Get Together | Getaway | Custom | Airbnb, restaurants |
| Girls Trip | Getaway | Custom | Airbnb, restaurants, activities |

Each template ships with:
- Pre-populated booking checklist (group + individual sections)
- Default pack list (editable)
- Suggested themed day names (e.g. "Race Day", "Rest Day", "Jersey Day" for ski)
- Activity-specific result field definitions

### 6.4 Create a Series
Minimum steps to establish a crew's recurring event:
1. Choose a trip template (sets activity type, checklist, pack list defaults)
2. Name the series (e.g. "The Torture Tour")
3. Choose a theme (Circuit / Club / Trail / Getaway) — pre-selected based on template, overridable
4. Define series awards (e.g. MVP, The Totem) — customizable, template provides defaults
5. Optional: tagline, logo (AI-assisted generation), bylaws/motto, Core Crew designations
6. Invite crew members by email or share link

### 6.5 Plan an Event
Each year, the Sponsor designates an Organizer, who creates and owns that year's event. Planning flow:
1. Organizer proposes dates, locations, and activity (if variable across years)
2. **The Call — Stage 2** fires to notify crew that voting is open
3. Crew votes: yes / no / maybe on each proposal
4. Organizer reviews votes and locks in the date, location, activity
5. **The Call — Stage 3** fires to confirm the event is official
6. Event moves from `planning` → `scheduled`

### 6.5 The Call
The Call is not a single notification — it is a three-stage ritual that drives the entire planning lifecycle. Each stage has a distinct purpose, tone, and UX moment.

#### The Call — Stage 1: The Summons
**Trigger**: Auto-generated ~6 months before the crew's typical annual window, when no event is in `planning` state for the upcoming cycle.
**Recipient**: The entire crew — everyone gets the nudge, not just the Sponsor. The idea is collective pressure. Anyone can forward it to the group or use it as the conversation starter.
**Purpose**: A prod. The app notices nothing is in motion and blows the horn. "It's time to plan."
**Tone**: Epic, philosophical, slightly dark. Memento mori meets adventure culture.

**AI-Generated Quote Copy**: Each Stage 1 notification is powered by an AI-generated quote — unique per send, referencing the series name and built around themes of carpe diem, mortality, and the urgency of living. The quote is the notification body. Examples of the target voice:

> *"No trip on the books, Carpe Diem Crew — quam minimum credula postero. Trust as little as possible in tomorrow."*

> *"Most men die at 25 but are buried at 75. Don't be those men. Get a [Torture Tour] on the books."* — Benjamin Franklin (adapted)

> *"The mountains are calling and you are making excuses. Another year is not guaranteed. [Torture Tour] — when?"*

The AI (Claude API) generates these dynamically, seeded with:
- The series name
- How many years the crew has been running (e.g. "17 years strong")
- The current date / time of year
- A rotating thematic angle (Latin stoicism, literary, historical, raw/direct)

Quotes are stored with each notification send so the archive can show the quote that fired for each year.

#### The Call — Stage 2: The Vote
**Trigger**: Organizer has posted proposals (dates, locations, activity) and opens voting.
**Recipient**: All crew members
**Purpose**: Summon the crew to weigh in. Life is busy. This cuts through.
**Tone**: This is real. Show up and vote.

#### The Call — Stage 3: The Confirmation
**Trigger**: Organizer locks the date, location, and activity. Event moves to `scheduled`.
**Recipient**: All crew members
**Purpose**: It's official. The mythology grows. Drop everything — you're going.
**Tone**: Ceremonial. This is the moment.

#### The Call — Stage 3a: The Commit Reminder
**Trigger**: A crew member has not responded or confirmed attendance after Stage 3 fires.
**Recipient**: Individual crew members who haven't committed
**Purpose**: Gentle but firm. Nobody gets left behind — or left out.

#### Delivery — All Stages
- **Email first**: All Call stages are delivered via transactional email (Resend + React Email). Emails are designed to match the series theme and carry the same dramatic voice as the in-app experience.
- **No web push notifications**: Deliberate decision. Web push is unreliable and interruptive. Email is universal, persistent, and feels more ceremonial for something this important.
- **In-app notification feed**: A persistent notification indicator in the UI surfaces pending Calls, vote requests, and commit reminders. Users see what's waiting for them when they open the app.

#### UX Design — In-App Call Experience
- **Full-screen takeover**: When a user opens the app with an unacknowledged Stage 3 Call, they are presented with a full-screen, dramatic landing experience before reaching the dashboard. They must acknowledge it to proceed.
- **Stage 1 & 2**: Surfaced as prominent banners or notification cards within the app — not a takeover, but impossible to miss.
- **Visual metaphor**: A viking blowing a horn. Powerful, primal, ancient.
- **Sound**: A viking horn audio cue plays on the Stage 3 in-app takeover. Opt-out available but on by default.
- **Animation**: Framer Motion — dramatic entrance, not subtle.
- **Copy**: Each stage has its own voice. Stage 3 is the loudest.

### 6.6 App Modes

Yearout has two primary UI modes depending on whether an active series exists.

**Mode 1 — Empty State (no series)**
Clean, welcoming. A single prompt: *"You should create one — want help getting started?"* Guides the user directly into series creation via template selection. No dashboard noise.

**Mode 2 — Series Active**
The app shell recedes entirely. The series takes over. A minimal Yearout header (wordmark + hamburger menu) is the only chrome. Everything below belongs to the series.

*(Super Admin is a separate route — `/admin` — not accessible from the main app UI.)*

### 6.7 Tour View (Series Home)
The emotional core of the app and the home screen for any active series. Design references:
- **Lord Huron tour page** (lordhuron.com/tour) — minimal header, clean chronological setlist, moody and atmospheric. Lines between rows, no clutter.
- **X Games results** (xgames.com/results) — year rows that click into full event detail.

**Layout (top → bottom):**

```
[ Yearout wordmark ]                    [ ≡ ]

        [ Series Logo ]
         e.g. Torture Tour Logo

  [ NEXT EVENT ]     or     [ LAST EVENT RESULTS ]
   (if upcoming)              Location · Host · MVP

  ┌──────────────────────────────────────────────┐
  │ Year   Location        Host     MVP    ...   │
  ├──────────────────────────────────────────────┤
  │ 2025   Whistler        Zack     TBD          │
  │ 2024   Taos            —        —            │
  │ 2023   Squaw/Heavenly  —        —            │
  │  ...                                        │
  │ 2009   South Lake Tahoe —       —            │
  └──────────────────────────────────────────────┘

  [ About ]  [ Crew ]  [ Lore ]  [ Merch ]
```

**Conditional hero block:**
- If an event is in `planning` or `scheduled` state → show "Next Event" with CTA (vote, commit, book depending on state)
- If the most recent event is `closed` and no new event exists → show "Last Event Results" with high-level summary (location, host, MVP, The Totem)
- If The Call Stage 3 is unacknowledged → full-screen takeover before this view loads

**Tour table:**
- One row per event, most recent at top, founding year at bottom
- Columns: Year | Location | Host (Organizer) | MVP | *(additional awards columns per series definition)*
- Each row is tappable → expands into the full event archive (X Games model)
- The table is the mythology. 17 rows for The Torture Tour.

**Bottom navigation tabs:**
- **About** — series info, bylaws/motto, activity type, theme, founding year
- **Crew** — member roster, Core Crew badges, all-time leaderboard
- **Lore** — Hall of Fame moments and stories across all events; this is the mythology browser
- **Merch** — Phase 2 placeholder (designed into nav from day one; shows "coming soon" in Phase 1)

### 6.7b Event Page
The single event view. One page, scrollable, that adapts its content based on event state. Same minimal header (Yearout wordmark + hamburger). Series logo sits above the event name.

**Layout (top → bottom):**
```
[ Yearout ]                                  [ ≡ ]

              [ Series Logo ]

     ┌─────────────────────────────────┐
     │   TT Whistler 2025              │  ← Event name hero
     └─────────────────────────────────┘

     ┌─────────────────────────────────┐
     │  AWARDS                         │
     │  [Runner Up]  [MVP]  [LUP]      │  ← Awards podium
     │  [crew avatars →]   Add/Edit →  │
     └─────────────────────────────────┘

     ┌─────────────────────────────────┐
     │  LORE                           │
     │  [Image] [Text/Memories] [📍]   │  ← Lore entries
     └─────────────────────────────────┘

     ┌─────────────────────────────────┐
     │  DAY LOG                        │
     │  Fastest Speed · Results        │  ← Activity log
     └─────────────────────────────────┘

     ┌─────────────────────────────────┐
     │  Admin · Settle Expenses        │  ← De-emphasized bottom
     └─────────────────────────────────┘
```

**Crew Attendance block:**
- Shown near the top of the event page, below the event name hero
- Displays avatars + names of all crew members who attended this event
- Distinct from the full series crew roster — attendance is confirmed per event
- Core Crew members are visually distinguished
- Attendance is set by the Organizer during or after the event; crew members can self-confirm

**Awards block:**
- Three-column podium: Runner Up | **MVP** (center, hero size) | LUP (Least Useful Player — the anti-award)
- Custom award names per series (TT uses MVP + The Totem; displayed as MVP + LUP generically)
- Crew member avatars shown; tap an avatar to assign or view award
- "Add / Edit Award" action for Organizer
- Awards determined by crew vote (see Section 6.11 Close Out)
- Awards are editable by Sponsor after `closed` if correction is needed

**Lore block:**
- Entry types: **Image**, **Text / Memory**, **Check-in** (location pin)
- Anyone on the crew can post during `in_progress`
- Any entry can be flagged as a Hall of Fame moment (persists in the cross-series Lore tab forever)
- Displayed as a horizontal scroll of cards, most recent first

**Day Log block:**
- Grouped by day, with the day's itinerary theme at the top (e.g. "Race Day")
- Shows activity results for the day (e.g. Fastest Speed, skier cross winner)
- Log entries for the day appear below results

**Admin block:**
- Intentionally small and bottom-anchored — not the point of the page
- Contents vary by state: during `in_progress` shows running expense total; during `close_out` shows full settlement flow
- Only Organizer and Sponsor see the full admin controls; crew sees read-only summary

**Event page states:**

| State | Hero content | Awards | Lore | Day Log | Admin |
|---|---|---|---|---|---|
| `planning` | Proposals + voting UI | Hidden | Hidden | Hidden | Hidden |
| `scheduled` | Booking checklist + Commitment Board | Hidden | Hidden | Hidden | Hidden |
| `in_progress` | Dates + location confirmed | Add/edit awards | Post entries | Post results | Add expenses |
| `closed` | Full results summary | Read-only, final | Read-only | Read-only | Settled summary |

### 6.7c Lore Tab (Cross-Series)
The Lore tab on the Tour View is the mythology browser — it surfaces Hall of Fame moments, memories, and check-ins across every event in the series, not just one.

**What it shows:**
- All HOF-flagged lore entries from every event, reverse-chronological
- Filterable by year, by person, by type (image / memory / check-in)
- Each entry links back to its source event
- The emotional payoff for years of consistent logging — scroll back through 17 years of The Torture Tour in one view

**Distinction from single event lore:**
- Single event → all lore for that year, structured within the event page
- Cross-series Lore tab → only the best moments (HOF-flagged), spanning all years, built for nostalgia browsing

### 6.8 Book It (Scheduled State)
This is a core differentiator. Yearout removes the friction between "it's confirmed" and "everyone is actually booked." Two distinct booking tracks run in parallel:

#### Group Booking (Organizer-owned)
Items the Organizer arranges for the whole crew:
- Lodging (e.g. group Airbnb, hotel block)
- Restaurant reservations
- Group activity reservations (e.g. tee times, ski school, guided tours)
- Organizer marks each item as booked; visible to entire crew

#### Individual Booking (Crew Member-owned)
Items each person handles for themselves:
- Flights / travel to destination
- Rental car (if needed)
- Personal lift tickets, gear rentals, etc.

**Smart Booking Helpers (Phase 1 MVP):**
- **Nearest airport(s)**: Once a destination is locked, Yearout surfaces the 1–3 nearest airports with IATA codes
- **Google Flights deep link**: "Book my flight" generates a pre-filled Google Flights URL with destination airport + event dates. One tap to land on a filtered search — no typing required.
- **Pack list**: Template-generated, editable per event. Crew members can check off items as they pack. Optional but high-value.

**The Commitment Board:**
- Every crew member has a visible booking status on the event page: `Committed` / `Flights booked` / `All booked` / `Not yet`
- This is public to the whole crew — peer pressure is a feature, not a bug
- Organizer can see at a glance who is lagging
- Connects to the Stage 3a Commit Reminder (The Call)

**Optional:** Spouse/guest add-ons per crew member

### 6.9 Smart Share Links
Every event and action in Yearout has a shareable deep link. Links are context-aware — they drop the recipient into the right moment with the right call to action based on the event state and their role.

**How it works:**
- Links are generated per-event and per-role/action
- Opening a link: if logged in → lands in context; if not → auth screen → then context
- The Organizer has a UI to copy/share links at each stage (one tap to clipboard, ready for WhatsApp)

**Link types:**
| Context | Who sends it | What the recipient sees |
|---|---|---|
| Start voting | Organizer → Crew | Vote proposals CTA, current proposals displayed |
| Commit to event | Anyone → uncommitted crew member | Commitment CTA + AI-generated carpe diem quote |
| Book your flight | Anyone → unbooked crew member | Airport info + Google Flights deep link |
| View the archive | Anyone | Past event archive, no auth wall |

**AI-generated motivational copy**: When sharing a commit link, the sender can include an AI-generated quote (same voice as Stage 1 Summons) that appears in the UI when the recipient opens it — not just in email, but rendered on the page itself. Makes the nudge feel personal and on-brand.

### 6.10 In Progress
Active features during the trip:

- **Daily Itinerary**: The Organizer can set a named theme or agenda for each day (e.g. "Jersey Day", "Race Day", "Throwback Thursday"). Displayed at the top of each day's log view. Optional but encouraged — this is where crew traditions live.
- **Daily Log**: Anyone can post a log entry for the day — text, photos, type (general / result / hall of fame moment)
- **Activity Results**: Structured, activity-specific result entry. Fields vary by series type:
  - Ski: fastest speed, skier cross wins, vertical feet
  - Golf: lowest score, skins won
  - Custom: series can define their own result fields
- **Expenses**: Splitwise-style expense tracking. Each crew member logs what they paid (amount + description). The app tallies the total, calculates the equal share per person, and shows each member what they owe or are owed. No manual split math required.
- **Hall of Fame**: Flag any log entry as a HOF moment; these persist in the series archive forever

### 6.11 Close Out
End-of-event flow initiated by the Organizer. Consists of three steps before the chapter is sealed.

**Step 1 — Settle Expenses**
- Full expense ledger: every item logged during the trip, who paid, amount
- Auto-calculated settlement: equal split across attending crew members
- Each person sees a net balance: "You owe $X to Y" or "Z owes you $X"
- Crew members mark payments as settled (honor system — no payment processing in Phase 1)
- Organizer can see overall settlement status and nudge unsettled members

**Step 2 — Award Voting**
- Organizer kicks off the voting round from the Close Out flow
- Each attending crew member receives a vote prompt (email + in-app)
- **Voting rules**: each voter gets **2 votes per award** (e.g. 2 votes for MVP, 2 votes for LUP); cannot vote for themselves
- Votes are private until the round closes
- Organizer closes voting and the app tallies — most votes wins
- Ties: Organizer breaks the tie
- Results displayed as the awards podium on the Event Page
- Voting interface is simple: scrollable list of crew member cards, tap to allocate votes, submit

**Step 3 — Seal the Chapter**
- Video edit prompt: link to Google Drive or Apple Photos shared album for a highlight reel
- Organizer confirms: event moves to `closed`, joins the Tour View archive
- All lore, results, and awards are now permanent

**Post-close edits:**
- Once `closed`, the event is read-only for all crew members
- **Sponsor** retains edit capability for corrections: awards, expense entries, attendance, lore entries
- No re-opening of voting once closed — corrections are direct edits by Sponsor only

### 6.12 Series Archive (Past Events)
- Every closed event is permanently accessible
- Shows: dates, location, crew, awards, HOF moments, log highlights, daily itinerary
- Core Crew members are distinguished in the archive

### 6.13 Crew Tab
The roster and hall of records for the series.

**Crew Card** — each member has a card displaying:
- Profile photo / mugshot — user-provided by default; **Sponsor can override** with any image they find funnier or more nostalgic. A deliberate feature.
- Name
- Nickname — set by the crew member themselves first; **Sponsor can override** with what the group actually calls them (e.g. "Zack" becomes "Z-Money"). Sponsor's version takes display precedence.
- Nationality — fun, Olympic-style flag display. Can be real or totally made up. Part of the personality.
- Core Crew badge (if applicable)

**All-Time Leaderboard** — sortable stats across every event in the series:
| Stat | Description |
|---|---|
| Events Attended | Total appearances |
| MVPs Won | Times awarded the top award |
| LUPs Won (The Totem) | Times awarded the anti-award — also a badge of honor |
| Events Organized | Times served as Organizer |
| Lore Submitted | Total lore entries posted across all events — links to their contributions |

The leaderboard is the competitive soul of the Crew tab. 17 years of Torture Tour data makes this immediately compelling.

### 6.13 Super Admin Dashboard
A separate internal tool for platform operations and debugging. Not linked from the main app UI.

**Authentication — two-factor:**
1. Google or Apple OAuth (same as the main app)
2. A secondary private password stored as an environment variable (`ADMIN_PASSWORD`)
Both factors must pass. If either fails, access is denied. This gives us real identity (OAuth) plus a shared secret only the team knows.

**Implementation**: Next.js route group (`/admin`), middleware-protected. Separate layout from the main app.

---

#### Tab 1 — Analytics
Platform health at a glance:

| Metric | Description |
|---|---|
| Total Circuits | All circuits created on the platform |
| Total Events | All events across all circuits |
| Total Sponsors | Unique sponsors (circuit creators) |
| Total Crew Members | Unique users across all circuits |
| Events by Stage | Count of events in each state: planning / scheduled / in_progress / closed |
| Stall Detection | Circuits or events that appear stuck — e.g. in `planning` > 60 days, in `scheduled` > 30 days with no bookings confirmed, in `in_progress` > 14 days |

Stall Detection surfaces the most actionable insight: where are users getting stuck and dropping off?

---

#### Tab 2 — Search & Browse
Full-text search across all entities:
- Search circuits by name, activity type, theme, sponsor
- Search events by year, location, stage, organizer
- Search crew members by name, email, nickname, nationality

Each result is expandable to show full detail. From any circuit or event result, the Super Admin can **join as Sponsor/Admin** — a one-click impersonation that drops them into that circuit with full Sponsor permissions for debugging. Action is logged.

---

#### Tab 3 — Data Management
- Seed / manage test data (The Torture Tour CSV import)
- Manual Call trigger override (fire any stage for any circuit — for testing)
- View and manage all email sends (Call history, delivery status)
- User account management (merge, deactivate)

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
| Database | Neon (serverless Postgres) | Consistent with existing projects, one dashboard, serverless-native |
| ORM | Drizzle ORM | Lightweight, excellent TypeScript support, built for Neon's serverless driver |
| Auth | Auth.js v5 (NextAuth) | Google + Apple OAuth; Neon/Postgres adapter; MFA email/password for Super Admin |
| File Storage | Vercel Blob | Photos, logos, media — native to Vercel deployment |
| Deployment | Vercel | Zero-config Next.js deployment |
| Cron | Vercel Cron Jobs | Stage 1 Call auto-trigger (scheduled job) |
| Icons | Lucide React | Clean, consistent icon set |
| AI | Claude API (Anthropic) | AI-generated Stage 1 quote copy and motivational share link copy |
| Email | Resend + React Email | Transactional email for all notification stages |

---

## 10. Data Model (High Level)

```
User
└── series_members → Series (one user can belong to many series)
                     ├── sponsor_id (User, permanent)
                     ├── theme
                     ├── activity_type
                     ├── awards_definition[] (custom per series, e.g. MVP, The Totem)
                     └── events[]
                           ├── organizer_id (User, designated per event by Sponsor)
                           ├── status: planning → scheduled → in_progress → closed
                           ├── proposals[] + votes[]
                           ├── daily_itinerary[] (day + theme/name, e.g. "Jersey Day")
                           ├── logs[] (daily entries, HOF moments)
                           ├── activity_results[] (schema varies by activity_type)
                           ├── attendees[] (subset of series members who attended)
                           ├── expenses[] (who paid, amount, description)
                           ├── expense_settlements[] (who owes whom, settled boolean)
                           ├── award_votes[] (voter_id, award_id, nominee_id — max 2 per award per voter, no self-vote)
                           └── awards[] (references awards_definition, winner resolved from vote tally)

series_members
  ├── role: sponsor | organizer | crew_member
  ├── is_core_crew: boolean
  └── booking_status: not_yet | committed | flights_booked | all_booked

user_profiles
  ├── display_name
  ├── photo_url (Vercel Blob, user-provided)
  └── nationality (free text, fun — can be real or invented)

circuit_member_profiles (per-circuit overrides, set by Sponsor)
  ├── nickname (Sponsor override takes display precedence over user's own nickname)
  └── photo_url_override (Sponsor can replace with funnier/more nostalgic mugshot)

templates[] (platform-provided, later guide-created)
  ├── activity_type
  ├── default_checklist_items[]
  ├── default_pack_list[]
  ├── default_result_fields[]
  └── suggested_themed_days[]

share_links[]
  ├── event_id
  ├── link_type: vote | commit | book | archive
  ├── ai_quote (generated at send time, stored)
  └── token

call_sends[]
  ├── stage: 1 | 2 | 3 | 3a
  ├── ai_quote (Stage 1 only)
  └── sent_at
```

---

## 11. Phase 1 Scope (MVP)

The MVP is the full lifecycle for a single crew:

- [ ] Auth — Google + Apple OAuth (Supabase); Super Admin email/password with MFA
- [ ] Roles: Sponsor, Organizer (designated per event), Crew Member, Core Crew flag
- [ ] Trip templates (7 first-party: Ski, Golf, MTB, Fishing, Backpacking, Family, Girls Trip)
- [ ] Create a series (template → name → theme → awards → invite)
- [ ] Tour view (past events + upcoming)
- [ ] Plan & vote (propose dates/locations/activity, crew votes, Organizer locks)
- [ ] The Call — all four stages with full-screen UX and viking horn metaphor
- [ ] AI-generated Stage 1 quote copy (Claude API, crew-wide delivery)
- [ ] Smart booking: group + individual tracks, airport helper, Google Flights deep link, pack list
- [ ] Commitment Board (public booking status, peer pressure by design)
- [ ] Smart Share Links with AI-generated motivational copy
- [ ] Daily itinerary (named/themed days per event)
- [ ] Daily log (text + photos)
- [ ] Activity results (flexible fields per activity type)
- [ ] Expense splitting
- [ ] Hall of fame flagging
- [ ] Close out: expense settlement (Splitwise-style auto-calculation)
- [ ] Close out: award voting (2 votes per award, no self-vote, Organizer kicks off + closes)
- [ ] Close out: seal the chapter → event archived
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
- [ ] AI logo generation (Phase 2) — which image model/API?
- [ ] Stage 1 quote generation: pre-generate on a schedule and store, or generate on-the-fly at send time?
- [ ] Do we support real-time expense updates during the trip (Supabase realtime)?
- [ ] How do we handle crew members who don't have the app yet (SMS invites)?
- [ ] The Call Stage 1 timing: fires 6 months before the series' typical annual month (derived from event history). Implemented as a scheduled job (Vercel Cron).
- [ ] Can the Organizer role rotate automatically (e.g. round-robin), or is it always manually assigned by the Sponsor?

---

## Appendix A — Domain & URL Structure

- **Production**: `yearout.zkhowes.fun` (subdomain on hover.com, CNAME to Vercel)
- **Series URLs**: `yearout.zkhowes.fun/[series-slug]` — e.g. `yearout.zkhowes.fun/torturetour`
- **Event URLs**: `yearout.zkhowes.fun/torturetour/2025`
- **Share links**: `yearout.zkhowes.fun/join/[token]`
- **Admin**: `yearout.zkhowes.fun/admin` (middleware-protected)

---

## Appendix B — Test Series: The Torture Tour

**Real-world seed data for development and testing.**

> **CSV import**: Historical Torture Tour data will be provided as a CSV at `/public/files/` for seeding via the Super Admin dashboard. Drop the file there and trigger the import from Tab 3 — Data Management. One-time operation; no recurring import flow needed.

- **Series name**: The Torture Tour
- **Activity**: Ski
- **Theme**: The Circuit
- **Awards**: MVP, The Totem (anti-MVP / Least Value Player)
- **Core Crew**: ~8 members, founding group from 2009
- **Sponsor**: zkhowes

### Event History (2009–2025)
*(MVP winners to be filled in — reminder pending)*

| Year | Location | Mountains |
|------|----------|-----------|
| 2009 | South Lake Tahoe, CA | Heavenly |
| 2010 | South Lake Tahoe, CA | Heavenly |
| 2011 | South Lake Tahoe, CA | Heavenly, Kirkwood |
| 2012 | South Lake Tahoe, CA | Heavenly |
| 2013 | Snowbird, UT | Snowbird, Brighton |
| 2014 | Park City, UT | Big Basin, Park City |
| 2015 | Eden, UT | Powder Mountain |
| 2016 | Skykomish, WA | Stevens Pass |
| 2017 | Eden, UT | Powder Mountain |
| 2018 | Deming, WA | Mount Baker |
| 2019 | Eden, UT | Powder Mountain |
| 2020 | Big Sky, MT | Jackson Hole |
| 2021 | Teton Village, WY | Jackson Hole |
| 2022 | Zurich, Switzerland | Dolder, Titlis |
| 2023 | South Lake Tahoe, NV | Squaw, Heavenly |
| 2024 | New Mexico | Taos |
| 2025 | British Columbia, Canada | Whistler |

### Known Traditions / Themed Days
- Jersey Day
- Throwback Day
- *(Others to be added)*

### Competition Format
- Inconsistent year to year — speed of day, skier cross wins, other formats
- Activity results schema for ski series should support: fastest speed, skier cross wins, vertical feet, and custom fields
