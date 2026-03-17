CREATE TABLE "event_award_links" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"award_definition_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_award_links_unique" UNIQUE("event_id","award_definition_id")
);
--> statement-breakpoint
ALTER TABLE "event_award_links" ADD CONSTRAINT "event_award_links_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_award_links" ADD CONSTRAINT "event_award_links_award_definition_id_ritual_award_definitions_id_fk" FOREIGN KEY ("award_definition_id") REFERENCES "public"."ritual_award_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_award_links_event_id_idx" ON "event_award_links" USING btree ("event_id");