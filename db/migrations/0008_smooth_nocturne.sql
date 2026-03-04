CREATE TABLE "event_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"link" text,
	"note" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;