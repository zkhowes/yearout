ALTER TABLE "ritual_members" ADD COLUMN "is_placeholder" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ritual_members" ADD COLUMN "placeholder_created_by" text;--> statement-breakpoint
ALTER TABLE "rituals" ADD COLUMN "read_only_token" text;--> statement-breakpoint
ALTER TABLE "ritual_members" ADD CONSTRAINT "ritual_members_placeholder_created_by_users_id_fk" FOREIGN KEY ("placeholder_created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rituals" ADD CONSTRAINT "rituals_read_only_token_unique" UNIQUE("read_only_token");