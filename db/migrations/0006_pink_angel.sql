CREATE TABLE "lore_mentions" (
	"id" text PRIMARY KEY NOT NULL,
	"lore_entry_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_attendees" ADD COLUMN "is_host" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rituals" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "lore_mentions" ADD CONSTRAINT "lore_mentions_lore_entry_id_lore_entries_id_fk" FOREIGN KEY ("lore_entry_id") REFERENCES "public"."lore_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lore_mentions" ADD CONSTRAINT "lore_mentions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;