CREATE TABLE "expense_splits" (
	"id" text PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"confirmed_at" timestamp,
	"confirmed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "split_type" text DEFAULT 'equal' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Backfill expense_splits for existing expenses (equal split among non-"out" attendees)
INSERT INTO "expense_splits" ("id", "expense_id", "user_id", "amount")
SELECT
  gen_random_uuid()::text,
  e.id,
  ea.user_id,
  FLOOR(e.amount / attendee_counts.cnt)
    + CASE
        WHEN ROW_NUMBER() OVER (PARTITION BY e.id ORDER BY ea.user_id)
             <= (e.amount % attendee_counts.cnt)
        THEN 1 ELSE 0
      END
FROM expenses e
JOIN event_attendees ea ON ea.event_id = e.event_id AND ea.booking_status != 'out'
JOIN (
  SELECT event_id, COUNT(*)::int AS cnt
  FROM event_attendees
  WHERE booking_status != 'out'
  GROUP BY event_id
) attendee_counts ON attendee_counts.event_id = e.event_id
WHERE NOT EXISTS (
  SELECT 1 FROM expense_splits es WHERE es.expense_id = e.id
);