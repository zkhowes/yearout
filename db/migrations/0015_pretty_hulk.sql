CREATE TABLE "call_schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"ritual_id" text NOT NULL,
	"event_id" text,
	"stage" integer NOT NULL,
	"variant" text,
	"scheduled_for" timestamp NOT NULL,
	"draft_ai_copy" jsonb,
	"draft_content" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"triggered_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "call_sends" ADD COLUMN "variant" text;--> statement-breakpoint
ALTER TABLE "call_sends" ADD COLUMN "ai_copy" jsonb;--> statement-breakpoint
ALTER TABLE "call_sends" ADD COLUMN "recipients" jsonb;--> statement-breakpoint
ALTER TABLE "call_sends" ADD COLUMN "resend_message_id" text;--> statement-breakpoint
ALTER TABLE "call_sends" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "call_sends" ADD COLUMN "triggered_by" text;--> statement-breakpoint
ALTER TABLE "call_schedule" ADD CONSTRAINT "call_schedule_ritual_id_rituals_id_fk" FOREIGN KEY ("ritual_id") REFERENCES "public"."rituals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_schedule" ADD CONSTRAINT "call_schedule_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_schedule_ritual_id_idx" ON "call_schedule" USING btree ("ritual_id");--> statement-breakpoint
CREATE INDEX "call_schedule_status_idx" ON "call_schedule" USING btree ("status");