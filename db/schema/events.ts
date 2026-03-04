import { pgTable, text, timestamp, pgEnum, integer, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'
import { rituals } from './rituals'

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
  ritualId: text('ritual_id').notNull().references(() => rituals.id, { onDelete: 'cascade' }),
  organizerId: text('organizer_id').references(() => users.id),
  name: text('name').notNull(),       // e.g. "TT Whistler 2025"
  year: integer('year').notNull(),
  location: text('location'),
  mountains: text('mountains'),       // comma-separated venues
  startDate: timestamp('start_date', { mode: 'date' }),
  endDate: timestamp('end_date', { mode: 'date' }),
  logoUrl: text('logo_url'),
  status: eventStatusEnum('status').notNull().default('planning'),
  coverPhotoUrl: text('cover_photo_url'),        // group photo for the event
  editUrl: text('edit_url'),                    // YouTube/Vimeo link for trip edit video
  editThumbnailUrl: text('edit_thumbnail_url'), // custom thumbnail (Vercel Blob)
  sealedAt: timestamp('sealed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const eventProposals = pgTable('event_proposals', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  proposedBy: text('proposed_by').notNull().references(() => users.id),
  dates: text('dates'),
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
  content: text('content'),
  mediaUrl: text('media_url'),        // Vercel Blob URL
  location: text('location'),         // for checkin type
  isHallOfFame: boolean('is_hall_of_fame').notNull().default(false),
  day: timestamp('day', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const loreMentions = pgTable('lore_mentions', {
  id: text('id').primaryKey(),
  loreEntryId: text('lore_entry_id').notNull().references(() => loreEntries.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
})

export const activityResults = pgTable('activity_results', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  day: timestamp('day', { mode: 'date' }),
  metric: text('metric').notNull(),   // e.g. "fastest_speed", "skier_cross_wins"
  value: text('value').notNull(),
  unit: text('unit'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  paidBy: text('paid_by').notNull().references(() => users.id),
  description: text('description').notNull(),
  amount: integer('amount').notNull(), // stored in cents
  splitType: text('split_type').notNull().default('equal'), // 'equal' | 'exact'
  category: text('category'), // lodging | food | transport | activity | other
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const expenseSplits = pgTable('expense_splits', {
  id: text('id').primaryKey(),
  expenseId: text('expense_id').notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  amount: integer('amount').notNull(), // this user's share in cents
})

export const settlementPayments = pgTable('settlement_payments', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  fromUserId: text('from_user_id').notNull().references(() => users.id),
  toUserId: text('to_user_id').notNull().references(() => users.id),
  amount: integer('amount').notNull(), // cents
  status: text('status').notNull().default('pending'), // 'pending' | 'paid' | 'confirmed'
  paidAt: timestamp('paid_at', { mode: 'date' }),
  confirmedAt: timestamp('confirmed_at', { mode: 'date' }),
  confirmedBy: text('confirmed_by').references(() => users.id),
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

export const eventBookings = pgTable('event_bookings', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'lodging' | 'transportation'
  name: text('name').notNull(), // e.g. "AirBnb", "Van"
  link: text('link'),           // URL (mainly for lodging)
  note: text('note'),           // free text note
  startDate: timestamp('start_date', { mode: 'date' }),
  endDate: timestamp('end_date', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const callSends = pgTable('call_sends', {
  id: text('id').primaryKey(),
  ritualId: text('ritual_id').notNull().references(() => rituals.id, { onDelete: 'cascade' }),
  eventId: text('event_id').references(() => events.id),
  stage: integer('stage').notNull(), // 1 | 2 | 3 | 4 (3a)
  aiQuote: text('ai_quote'),         // Stage 1 only — stored for the archive
  sentAt: timestamp('sent_at', { mode: 'date' }).defaultNow().notNull(),
})
