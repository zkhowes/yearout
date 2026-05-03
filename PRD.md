# Yearout — Product Requirements Document
**Version:** 1.4
**Date:** February 2026
**Status:** Draft

---

## 0. Naming Conventions

| Term | Definition |
|---|---|
| **Ritual** | The top-level product concept — a recurring group adventure tradition. "The Torture Tour is a Ritual." Used in UI, marketing, and data model. |
| **The Circuit** | A specific visual theme (dark, grungy, ski/adventure crews). Entirely distinct from the product concept. |
| **Event** | A single year's instance within a Circuit (e.g. "TT Whistler 2025") |
| **Sponsor** | Permanent admin of a Circuit |
| **Organizer** | Per-event role, designated by Sponsor |
| **Crew** | All participants in a Circuit |
| **Core Crew** | Founding members designation |
| **Lore** | Hall of Fame moments and memories — per event and cross-circuit |

> **Note**: "Ritual" is the canonical product term, rooted directly in Core Philosophy §3: "The Ritual Builds the Legend." "The Circuit" is a visual theme — no naming conflict.
> **Rename applied**: Series → Ritual throughout. "The Circuit" theme name is unchanged.

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

### 7. Delight, Never Guilt
The Call must feel like good news in the inbox — a nostalgia bomb, a horn going off in the distance, a memory you forgot you needed. Never a finger-wag, never "you haven't done X yet." Mode-aware (Cold Start vs Ongoing) and state-aware copy ensures the message lands right for where the crew is. Reply-All is a feature: emails are addressed to the whole crew so the chat starts in the inbox.

---

## 5. Target Users

### Primary: The Sponsor / Organizer
- Has an existing annual group trip tradition (ski, golf, backpacking, family)
- Frustrated by the coordination overhead every year
- Wants to preserve the memories and lore of their crew
- Likely 28–50, owns the logistics for the group

### Secondary: The Crew Member
- Invited into an existing ritual
- Wants to participate in voting, see the schedule, log moments, settle expenses
- Less interested in admin, highly interested in the fun parts (awards, HOF, leaderboard)

### Future: The Guide / Planner
- Expert in a particular type of trip (ski resorts, golf courses, backpacking routes)
- Wants to offer their services to crews who need help planning
- Part of the marketplace vision (Phase 2)

---

## 5.5 Roles & Permissions

### Sponsor
- The person who creates the ritual in the app
- Permanent ritual-level admin — cannot be transferred
- Designates an Organizer for each event (can designate themselves)
- Can manage crew membership, ritual settings, theme, and awards definition
- The Sponsor role is sacred: they are the keeper of the mythology

### Organizer
- Designated per-event by the Sponsor
- The Organizer role can rotate year to year (required for some rituals, optional for others)
- Owns the planning flow for their event: proposes dates, locations, activity
- Triggers The Call when locking in the event
- Manages the daily itinerary during the event
- Initiates Close Out

### Crew Member
- Standard participant role
- Can vote on proposals, log entries, add expenses, flag HOF moments, give and receive awards
- Cannot modify ritual settings or trigger The Call

### Core Crew (designation)
- An optional badge applied to founding members of a ritual
- Tracks who has been there from the beginning
- Displayed on profiles and the ritual archive
- Example: The Torture Tour has a Core Crew of original members who've been skiing together since 2009

---

## 6. App Structure & User Flow

### 6.1 Authentication
- **Google OAuth** and **Apple Sign In** are the primary auth methods — no username/password for end users
- Supabase Auth handles both natively (note: now using Auth.js v5)
- Invite-only joining for event rituals (no public discovery in Phase 1)
- A separate **Super Admin** role exists outside of Supabase Auth for internal platform management (see Section 6.11)

### 6.2 Dashboard
- List of all rituals the user belongs to (as Sponsor, Organizer, or Crew Member)
- Quick-action to create a new ritual
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

### 6.4 Create a Ritual
Minimum steps to establish a crew's recurring event:
1. Choose a trip template (sets activity type, checklist, pack list defaults)
2. Name the ritual (e.g. "The Torture Tour")
3. Choose a theme (Circuit / Club / Trail / Getaway) — pre-selected based on template, overridable
4. Define ritual awards (e.g. MVP, The Totem) — customizable, template provides defaults
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
The Call is not a single notification — it is an **8-variant matrix** that walks every event through its full lifecycle. Each variant is **state-aware** (none → planning → scheduled → in_progress → concluded → closed) and **mode-aware** (Cold Start: a ritual with no events yet, vs Ongoing: a ritual with history). Every email is delight, never guilt — the tone is excitement and nostalgia, not a finger-wag. All Calls go to the entire crew with **Reply-All as a feature**: the conversation starts in the inbox.

| State | Mode | Goal | Yearout features surfaced | Primary CTA |
|---|---|---|---|---|
| **none** | cold_start | Get a trip into `planning` | Ritual name, tagline, theme; AI rallying cry seeded by activity type | Plan the trip → |
| **none** | ongoing | Same | Years run, last location, last MVP, 1 HOF lore photo, AI nostalgia callback | Plan the next chapter → |
| **planning** | both | Get crew to vote | Date + location options with AI cards, anonymized vote tally | Cast your votes → |
| **scheduled** | both | Drive bookings + commitment | Event name + dates + location, nearest airport hint, commitment-board snapshot | Lock in your spot → |
| **scheduled** | both | Per-recipient nudge to uncommitted (Stage 3a) | Soft tone, references who has committed | Commit → |
| **scheduled** | both | Pack-list reminder, 7-14 days out (Stage 3b) | Activity-specific pack list (passport callout for international) | Review your pack list → |
| **in_progress** | both | Drive lore + expense logging (Stage 4 in-trip pulse) | Today's daily itinerary, running expense total, lore prompt | Drop a memory → |
| **concluded** | both | Drive close-out: settle expenses, vote awards, add final lore (Stage 5) | Awards podium (final or pending), expense settlement balance | Settle up → / Vote awards → |
| **closed (archived)** | both | Convert nostalgia → next planning (Stage 6 mythology, ~30d after seal) | Recap of all years, this year's MVP, ritual archive link | Start next year → |

**AI Copy** — every variant uses Claude Haiku to generate `{subject, headline, body}` per send. The system prompt enforces the "delight not guilt" voice rules. Generated copy is cached per send in `callSends.aiCopy` so the archive shows exactly what fired.

**Sponsor control over Stage 1** — instead of a fully-automatic cron, the cron *drafts* a Stage 1 email into a queue and notifies the Sponsor. The Sponsor previews, edits, then sends (or cancels, or snoozes). A manual **"Send the Summons now"** button is also available from the ritual's Call page. Both are subject to rate limits (see §6.5.5).

#### Delivery
- **Email first**: All Call stages are transactional email (Resend + React Email). Theme tokens mirror the ritual's chosen theme so the email feels native to The Circuit / The Club / The Trail / The Getaway.
- **All crew on To: with Reply-All encouraged** — the email's footer says "Reply all — get the crew talking." This is the chat starter.
- **Reply-To is `zkhowes@gmail.com`** in v1 — bypasses any need for a real inbound mailbox at the sending domain.
- **No web push notifications**: Deliberate decision. Email is universal, persistent, and feels more ceremonial.
- **In-app notification feed**: surfaces pending Calls, vote requests, and commit reminders.

#### Sending domain
Sends originate from `Yearout <call@send.yearout.zkhowes.fun>` — a dedicated sending subdomain that keeps deliverability reputation isolated from the apex `zkhowes.fun`. SPF + DKIM + DMARC configured at Hover; DMARC starts at `p=none` and escalates after 2-4 weeks of clean sends.

#### UX Design — In-App Call Experience
- **Full-screen takeover**: When a user opens the app with an unacknowledged Stage 3 Call, they are presented with a full-screen, dramatic landing experience before reaching the dashboard. They must acknowledge it to proceed.
- **Stage 1 & 2**: Surfaced as prominent banners or notification cards within the app — not a takeover, but impossible to miss.
- **Visual metaphor**: A viking blowing a horn. Powerful, primal, ancient.
- **Sound**: A viking horn audio cue plays on the Stage 3 in-app takeover. Opt-out available but on by default.
- **Animation**: Framer Motion — dramatic entrance, not subtle.
- **Copy**: Each stage has its own voice. Stage 3 is the loudest.

### 6.5.5 The Call — Rate Limits
The Call's power depends on scarcity. To preserve "delight not guilt" we cap how often a crew can be summoned:

| Scope | Limit | Window | Friendly block message |
|---|---|---|---|
| Per ritual — Stage 1 sends | 1 | 14 days | *"You sent The Summons already this fortnight. Let it breathe — try a Smart Share Link instead."* |
| Per ritual — all Call emails | 4 | 30 days | *"4 calls this month. The crew will start ignoring them. Take a beat."* |
| Per recipient — Stage 3a commit | 1 | 7 days | *"They got nudged in the last week — give them air."* |
| Per recipient — Stage 4 in-trip | 1 | 24 hours | *"Already pulsed them today."* |

Limits are surfaced in the Sponsor's Call page as a meter ("3 of 4 used this month") so the rule is visible *before* it bites. Admin force-sends from the Super Admin Test Harness bypass all limits (logged with `triggeredBy='admin'`).

### 6.6 App Modes

Yearout has two primary UI modes depending on whether an active series exists.

**Mode 1 — Empty State (no ritual)**
Clean, welcoming. A single prompt: *"You should create one — want help getting started?"* Guides the user directly into series creation via template selection. No dashboard noise.

**Mode 2 — Ritual Active**
The app shell recedes entirely. The series takes over. A minimal Yearout header (wordmark + hamburger menu) is the only chrome. Everything below belongs to the ritual.

*(Super Admin is a separate route — `/admin` — not accessible from the main app UI.)*

### 6.7 Tour View (Ritual Home)
The emotional core of the app and the home screen for any active series. Design references:
- **Lord Huron tour page** (lordhuron.com/tour) — minimal header, clean chronological setlist, moody and atmospheric. Lines between rows, no clutter.
- **X Games results** (xgames.com/results) — year rows that click into full event detail.

**Layout (top → bottom):**

```
[ Yearout wordmark ]                    [ ≡ ]

        [ Ritual Logo ]
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
- **About** — ritual info, bylaws/motto, activity type, theme, founding year
- **Crew** — member roster, Core Crew badges, all-time leaderboard
- **Lore** — Hall of Fame moments and stories across all events; this is the mythology browser
- **Merch** — Phase 2 placeholder (designed into nav from day one; shows "coming soon" in Phase 1)

### 6.7b Event Page
The single event view. One page, scrollable, that adapts its content based on event state. Same minimal header (Yearout wordmark + hamburger). Series logo sits above the event name.

**Layout (top → bottom):**
```
[ Yearout ]                                  [ ≡ ]

              [ Ritual Logo ]

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
- Any entry can be flagged as a Hall of Fame moment (persists in the cross-ritual Lore tab forever)
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

### 6.7c Lore Tab (Cross-Ritual)
The Lore tab on the Tour View is the mythology browser — it surfaces Hall of Fame moments, memories, and check-ins across every event in the ritual, not just one.

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
- **Activity Results**: Structured, activity-specific result entry. Fields vary by ritual type:
  - Ski: fastest speed, skier cross wins, vertical feet
  - Golf: lowest score, skins won
  - Custom: rituals can define their own result fields
- **Expenses**: Splitwise-style expense tracking. Each crew member logs what they paid (amount + description). The app tallies the total, calculates the equal share per person, and shows each member what they owe or are owed. No manual split math required.
- **Hall of Fame**: Flag any log entry as a HOF moment; these persist in the ritual archive forever

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

### 6.12 Ritual Archive (Past Events)
- Every closed event is permanently accessible
- Shows: dates, location, crew, awards, HOF moments, log highlights, daily itinerary
- Core Crew members are distinguished in the archive

### 6.13 Crew Tab
The roster and hall of records for the ritual.

**Crew Card** — each member has a card displaying:
- Profile photo / mugshot — user-provided by default; **Sponsor can override** with any image they find funnier or more nostalgic. A deliberate feature.
- Name
- Nickname — set by the crew member themselves first; **Sponsor can override** with what the group actually calls them (e.g. "Zack" becomes "Z-Money"). Sponsor's version takes display precedence.
- Nationality — fun, Olympic-style flag display. Can be real or totally made up. Part of the personality.
- Core Crew badge (if applicable)

**All-Time Leaderboard** — sortable stats across every event in the ritual:
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
2. Email allowlist via `ADMIN_EMAILS` env var (comma-separated; defaults to `zkhowes@gmail.com`) — the authenticated session email must match an entry in the alias to authorize admin pages
Both must pass. If either fails, access is denied.

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
- User account management (merge, deactivate)

---

#### Tab 4 — The Call (Test Harness)
Critical iteration surface. Without it, testing The Call requires walking events through every state, which is brutal.

Three-column layout:
- **Left (selectors)**: ritual dropdown, event dropdown (or "None — Stage 1 only"), variant override (auto-derived from event state, but switchable for edge variants like 3a, 3b, 6), recipient mode
- **Center (rendered email preview)**: live iframe of the React Email template with resolved content + AI copy. "Regenerate AI copy" button re-runs Haiku without re-rendering layout.
- **Right (debug)**: JSON dump of content object, AI prompt + raw response, token count, recipient list

Recipient modes:
- **Preview only** — render, never touch network
- **Send to test address** — defaults to `zkhowes@gmail.com`, single recipient
- **Send to real crew** — double-confirm modal, bypasses rate limits, logged with `triggeredBy='admin'`

This tool is reused (in subset form) as the Sponsor's `/[ritualSlug]/the-call` page — same templates, same content builders, same AI module.

---

#### Tab 5 — Email History
Browsable log of every Call email ever sent (`call_sends` table):
- Columns: sent at · ritual · event · stage · variant · recipient count · status · source · Resend message ID
- Filter by ritual / stage / date
- Click a row → full rendered HTML, AI copy used, recipient list

---

## 7. Theme System

The Yearout app shell is always clean, minimal, and neutral. Themes are applied at the **ritual level** — the Tour view, awards, HOF, and archive take on the ritual theme.

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
| Email | Resend + React Email | Transactional email for all Call stages. From: `Yearout <call@send.yearout.zkhowes.fun>` (dedicated sending subdomain). Reply-To: personal Gmail. SPF/DKIM/DMARC at Hover. |

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

call_sends[]                      // every email actually sent
  ├── ritual_id
  ├── event_id (nullable for Stage 1)
  ├── stage: 1 | 2 | 3 | 31 (3a) | 32 (3b) | 4 | 5 | 6
  ├── variant: stage1_cold_start | stage1_ongoing | stage2_vote | ... (string)
  ├── ai_copy (jsonb): { subject, headline, body, rawText, tokens }
  ├── recipients (jsonb): string[] of email addresses
  ├── resend_message_id
  ├── status: sent | delivered | bounced | opened | failed
  ├── triggered_by: cron | sponsor | admin | system
  └── sent_at

call_schedule[]                   // drafts awaiting Sponsor approval
  ├── ritual_id
  ├── event_id (nullable)
  ├── stage, variant
  ├── scheduled_for
  ├── draft_ai_copy (jsonb), draft_content (jsonb)
  ├── status: draft | scheduled | sent | cancelled | edited
  ├── triggered_by: cron | sponsor | admin
  └── created_at
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
- [x] The Call — 8-variant matrix (Stages 1 cold-start, 1 ongoing, 2 vote, 3 confirmed, 3a commit, 3b pack list, 4 in-trip, 5 closeout, 6 mythology) wired to Resend
- [x] Sponsor "Send the Summons" page with rate-limit meter
- [x] Admin Test Harness for previewing + force-sending any variant
- [ ] In-app full-screen takeover for Stage 3 (separate UI work; email pipeline ships first)
- [x] AI-generated copy per variant (Claude Haiku, cached per send)
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
- [ ] Ritual archive (past events, all-time leaderboard, award history)

---

## 12. Phase 2 (Post-MVP)

- Marketplace: guides and planners offer their services to crews
- AI logo generation for rituals
- Merchandise integration (shirts, stickers based on ritual theme)
- Video edit automation (integrate with Google Photos / Apple Photos APIs)
- Public ritual discovery (opt-in)
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
- [ ] The Call Stage 1 timing: fires 6 months before the ritual's typical annual month (derived from event history). Implemented as a scheduled job (Vercel Cron).
- [ ] Can the Organizer role rotate automatically (e.g. round-robin), or is it always manually assigned by the Sponsor?

---

## Appendix A — Domain & URL Structure

- **Production**: `yearout.zkhowes.fun` (subdomain on hover.com, CNAME to Vercel)
- **Ritual URLs**: `yearout.zkhowes.fun/[ritual-slug]` — e.g. `yearout.zkhowes.fun/torturetour`
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
