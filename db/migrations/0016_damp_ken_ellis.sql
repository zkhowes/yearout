CREATE TABLE "ritual_activity_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"ritual_id" text NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"emoji" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rituals" ALTER COLUMN "activity_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ritual_activity_templates" ADD CONSTRAINT "ritual_activity_templates_ritual_id_rituals_id_fk" FOREIGN KEY ("ritual_id") REFERENCES "public"."rituals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ritual_activity_templates" ADD CONSTRAINT "ritual_activity_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ritual_activity_templates_ritual_slug_uq" ON "ritual_activity_templates" USING btree ("ritual_id","slug");--> statement-breakpoint
DROP TYPE "public"."activity_type";