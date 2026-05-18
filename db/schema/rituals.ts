import { pgTable, text, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'

// Built-in activity slugs the app has emoji/labels for. Stored as plain text
// now (not an enum) so per-ritual custom activities (e.g. "sailing") are valid.
export const BUILTIN_ACTIVITY_TYPES = [
  'ski',
  'golf',
  'mountain_biking',
  'fishing',
  'backpacking',
  'family',
  'girls_trip',
  'other',
] as const
export type BuiltinActivityType = (typeof BUILTIN_ACTIVITY_TYPES)[number]

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
  // Free-text slug so per-ritual activities (e.g. "sailing") work without enum migration each time.
  // Use isBuiltinActivityType() if you need the curated set.
  activityType: text('activity_type').notNull(),
  theme: themeEnum('theme').notNull(),
  tagline: text('tagline'),
  logoUrl: text('logo_url'),
  bylaws: text('bylaws'),
  description: text('description'),
  foundingYear: text('founding_year'),
  typicalMonth: text('typical_month'), // e.g. "january" — used for Stage 1 Call timing
  heroPhotos: text('hero_photos'),                      // JSON array of photo URLs
  inviteToken: text('invite_token').notNull().unique(), // shared link token (join → become full member)
  // Public read-only viewer token. Lazy-generated on first share, rotatable.
  // Independent of inviteToken so rotating one doesn't break the other.
  readOnlyToken: text('read_only_token').unique(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

// Per-ritual templates for custom activities the user introduces (e.g. "sailing").
// Scope: ritualId is required — these are not global. An admin promotion flow
// will later move approved entries into the curated/global set.
export const ritualActivityTemplates = pgTable(
  'ritual_activity_templates',
  {
    id: text('id').primaryKey(),
    ritualId: text('ritual_id').notNull().references(() => rituals.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),       // lowercased, e.g. "sailing"
    label: text('label').notNull(),     // display, e.g. "Sailing"
    emoji: text('emoji'),               // optional, picked at creation
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (t) => ({
    ritualSlugUq: uniqueIndex('ritual_activity_templates_ritual_slug_uq').on(t.ritualId, t.slug),
  }),
)

export function isBuiltinActivityType(slug: string): slug is BuiltinActivityType {
  return (BUILTIN_ACTIVITY_TYPES as readonly string[]).includes(slug)
}

export const ritualAwardDefinitions = pgTable('ritual_award_definitions', {
  id: text('id').primaryKey(),
  ritualId: text('ritual_id').notNull().references(() => rituals.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),      // e.g. "MVP"
  label: text('label').notNull(),    // e.g. "Most Valuable Player"
  type: text('type').notNull(),      // "mvp" | "lup" | "runner_up" | "custom"
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})
