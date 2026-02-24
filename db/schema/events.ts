import { pgTable, text, timestamp, pgEnum, integer, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'
import { circuits } from './circuits'

export const eventStatusEnum = pgEnum('event_status', [
  'planning',
  'scheduled',
  'in_progress',
  'closed',
])

export const loreEntryTypeEnum = pgEnum('lore_entry_type', [
  'image',
  'memory',
  'checkin',
])

export const events = pgTable('events', {
  id: text('id').primaryKey(),
  circuitId: text('circuit_id').notNull().references(() => circuits.id, { onDelete: 'cascade' }),
  organizerId: text('organizer_id').references(() => users.id),
  name: text('name').notNull(),       // e.g. "TT Whistler 2025"
  year: integer('year').notNull(),
  location: text('location'),
  mountains: text('mountains'),       // comma-separated venues
  startDate: timestamp('start_date', { mode: 'date' }),
  endDate: timestamp('end_date', { mode: 'date' }),
  status: eventStatusEnum('status').notNull().default('planning'),
  sealedAt: timestamp('sealed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const eventProposals = pgTable('event_proposals', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  proposedBy: text('proposed_by').notNull().references(() => users.id),
  dates: text('dates'),               // freeform or ISO range
  location: text('location'),
  activity: text('activity'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const proposalVotes = pgTable('proposal_votes', {
  id: text('id').primaryKey(),
  proposalId: text('proposal_id').notNull().references(() => eventProposals.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  vote: text('vote').notNull(), // "yes" | "no" | "maybe"
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const dailyItinerary = pgTable('daily_itinerary', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  day: timestamp('day', { mode: 'date' }).notNull(),
  themeName: text('theme_name'),      // e.g. "Jersey Day", "Race Day"
  notes: text('notes'),
})

export const loreEntries = pgTable('lore_entries', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => users.id),
  type: loreEntryTypeEnum('type').notNull(),
  content: text('content'),           // text body or caption
  mediaUrl: text('media_url'),        // Vercel Blob URL for images
  location: text('location'),         // for checkin type
  isHallOfFame: boolean('is_hall_of_fame').notNull().default(false),
  day: timestamp('day', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const activityResults = pgTable('activity_results', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  day: timestamp('day', { mode: 'date' }),
  metric: text('metric').notNull(),   // e.g. "fastest_speed", "skier_cross_wins"
  value: text('value').notNull(),     // stored as text, parsed by activity type
  unit: text('unit'),                 // e.g. "mph", "wins"
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  paidBy: text('paid_by').notNull().references(() => users.id),
  description: text('description').notNull(),
  amount: integer('amount').notNull(), // stored in cents
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const awardVotes = pgTable('award_votes', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  awardDefinitionId: text('award_definition_id').notNull(),
  voterId: text('voter_id').notNull().references(() => users.id),
  nomineeId: text('nominee_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  // Enforced in app logic: max 2 votes per award per voter, no self-vote
})

export const awards = pgTable('awards', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  awardDefinitionId: text('award_definition_id').notNull(),
  winnerId: text('winner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const callSends = pgTable('call_sends', {
  id: text('id').primaryKey(),
  circuitId: text('circuit_id').notNull().references(() => circuits.id, { onDelete: 'cascade' }),
  eventId: text('event_id').references(() => events.id),
  stage: integer('stage').notNull(), // 1 | 2 | 3 | 4 (3a)
  aiQuote: text('ai_quote'),         // Stage 1 only — stored for the archive
  sentAt: timestamp('sent_at', { mode: 'date' }).defaultNow().notNull(),
})
