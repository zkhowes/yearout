ALTER TABLE "expenses" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "original_amount" integer;