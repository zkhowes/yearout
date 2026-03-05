import { pgTable, text, boolean, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { rituals } from './rituals'

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
  'out',
])

export const ritualMembers = pgTable('ritual_members', {
  id: text('id').primaryKey(),
  ritualId: text('ritual_id').notNull().references(() => rituals.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: crewRoleEnum('role').notNull().default('crew_member'),
  isCoreCrewe: boolean('is_core_crew').notNull().default(false),
  // Sponsor-overridable fields (per ritual)
  nicknameOverride: text('nickname_override'),   // Sponsor sets what the group calls them
  photoOverride: text('photo_override'),         // Sponsor's funnier/more nostalgic mugshot
  joinedAt: timestamp('joined_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  index('ritual_members_ritual_user_idx').on(table.ritualId, table.userId),
])

export const eventAttendees = pgTable('event_attendees', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull(), // references events.id — declared in events.ts
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookingStatus: bookingStatusEnum('booking_status').notNull().default('not_yet'),
  isHost: boolean('is_host').notNull().default(false),
  confirmedAt: timestamp('confirmed_at', { mode: 'date' }),
  // Flight details
  arrivalAirline: text('arrival_airline'),
  arrivalFlightNumber: text('arrival_flight_number'),
  arrivalDatetime: timestamp('arrival_datetime', { mode: 'date' }),
  departureAirline: text('departure_airline'),
  departureFlightNumber: text('departure_flight_number'),
  departureDatetime: timestamp('departure_datetime', { mode: 'date' }),
}, (table) => [
  index('event_attendees_event_user_idx').on(table.eventId, table.userId),
])
