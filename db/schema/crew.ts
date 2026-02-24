import { pgTable, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'
import { circuits } from './circuits'

export const crewRoleEnum = pgEnum('crew_role', [
  'sponsor',
  'organizer',
  'crew_member',
])

export const bookingStatusEnum = pgEnum('booking_status', [
  'not_yet',
  'committed',
  'flights_booked',
  'all_booked',
])

export const circuitMembers = pgTable('circuit_members', {
  id: text('id').primaryKey(),
  circuitId: text('circuit_id').notNull().references(() => circuits.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: crewRoleEnum('role').notNull().default('crew_member'),
  isCoreCrewe: boolean('is_core_crew').notNull().default(false),
  // Sponsor-overridable fields (per circuit)
  nicknameOverride: text('nickname_override'),   // Sponsor sets what the group calls them
  photoOverride: text('photo_override'),         // Sponsor's funnier/more nostalgic mugshot
  joinedAt: timestamp('joined_at', { mode: 'date' }).defaultNow().notNull(),
})

export const eventAttendees = pgTable('event_attendees', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull(), // references events.id — declared in events.ts
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookingStatus: bookingStatusEnum('booking_status').notNull().default('not_yet'),
  confirmedAt: timestamp('confirmed_at', { mode: 'date' }),
})
