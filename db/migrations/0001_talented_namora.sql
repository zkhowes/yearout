ALTER TYPE "public"."booking_status" ADD VALUE 'out';--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "arrival_airline" text;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "arrival_flight_number" text;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "arrival_datetime" timestamp;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "departure_airline" text;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "departure_flight_number" text;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "departure_datetime" timestamp;