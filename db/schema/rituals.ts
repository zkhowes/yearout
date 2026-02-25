import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'

export const activityTypeEnum = pgEnum('activity_type', [
  'ski',
  'golf',
  'mountain_biking',
  'fishing',
  'backpacking',
  'family',
  'girls_trip',
  'other',
])

export const themeEnum = pgEnum('theme', [
  'circuit', // The Circuit theme (dark, gold, ski/adventure)
  'club',
  'trail',
  'getaway',
])

export const rituals = pgTable('rituals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // e.g. "torturetour" → yearout.zkhowes.fun/torturetour
  sponsorId: text('sponsor_id').notNull().references(() => users.id),
  activityType: activityTypeEnum('activity_type').notNull(),
  theme: themeEnum('theme').notNull(),
  tagline: text('tagline'),
  logoUrl: text('logo_url'),
  bylaws: text('bylaws'),
  foundingYear: text('founding_year'),
  typicalMonth: text('typical_month'), // e.g. "january" — used for Stage 1 Call timing
  inviteToken: text('invite_token').notNull().unique(), // shared link token
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const ritualAwardDefinitions = pgTable('ritual_award_definitions', {
  id: text('id').primaryKey(),
  ritualId: text('ritual_id').notNull().references(() => rituals.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),      // e.g. "MVP"
  label: text('label').notNull(),    // e.g. "Most Valuable Player"
  type: text('type').notNull(),      // "mvp" | "lup" | "runner_up" | "custom"
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})
