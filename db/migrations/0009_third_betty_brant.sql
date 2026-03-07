ALTER TABLE "ritual_members" ADD COLUMN "nationality_override" text;--> statement-breakpoint
ALTER TABLE "ritual_members" ADD COLUMN "custom_flag_svg" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "ai_tips" text;--> statement-breakpoint
ALTER TABLE "award_votes" ADD CONSTRAINT "award_votes_award_definition_id_ritual_award_definitions_id_fk" FOREIGN KEY ("award_definition_id") REFERENCES "public"."ritual_award_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_award_definition_id_ritual_award_definitions_id_fk" FOREIGN KEY ("award_definition_id") REFERENCES "public"."ritual_award_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_attendees_event_user_idx" ON "event_attendees" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "ritual_members_ritual_user_idx" ON "ritual_members" USING btree ("ritual_id","user_id");--> statement-breakpoint
CREATE INDEX "award_votes_event_id_idx" ON "award_votes" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_ritual_id_idx" ON "events" USING btree ("ritual_id");--> statement-breakpoint
CREATE INDEX "expense_splits_expense_id_idx" ON "expense_splits" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "expenses_event_id_idx" ON "expenses" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "lore_entries_event_id_idx" ON "lore_entries" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "proposal_votes_proposal_id_idx" ON "proposal_votes" USING btree ("proposal_id");