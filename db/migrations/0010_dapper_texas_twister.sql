CREATE TABLE "call_date_options" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_location_options" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"ai_card" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"option_type" text NOT NULL,
	"option_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "call_mode" text;--> statement-breakpoint
ALTER TABLE "call_date_options" ADD CONSTRAINT "call_date_options_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_location_options" ADD CONSTRAINT "call_location_options_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_votes" ADD CONSTRAINT "call_votes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_votes" ADD CONSTRAINT "call_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_date_options_event_id_idx" ON "call_date_options" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "call_location_options_event_id_idx" ON "call_location_options" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "call_votes_event_id_idx" ON "call_votes" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "call_votes_unique_idx" ON "call_votes" USING btree ("user_id","option_type","option_id");