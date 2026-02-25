CREATE TYPE "public"."activity_type" AS ENUM('ski', 'golf', 'mountain_biking', 'fishing', 'backpacking', 'family', 'girls_trip', 'other');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('circuit', 'club', 'trail', 'getaway');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('not_yet', 'committed', 'flights_booked', 'all_booked');--> statement-breakpoint
CREATE TYPE "public"."crew_role" AS ENUM('sponsor', 'organizer', 'crew_member');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('planning', 'scheduled', 'in_progress', 'closed');--> statement-breakpoint
CREATE TYPE "public"."lore_entry_type" AS ENUM('image', 'memory', 'checkin');--> statement-breakpoint
CREATE TABLE "circuit_award_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"circuit_id" text NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circuits" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sponsor_id" text NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"theme" "theme" NOT NULL,
	"tagline" text,
	"logo_url" text,
	"bylaws" text,
	"founding_year" text,
	"typical_month" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "circuits_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "circuit_members" (
	"id" text PRIMARY KEY NOT NULL,
	"circuit_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "crew_role" DEFAULT 'crew_member' NOT NULL,
	"is_core_crew" boolean DEFAULT false NOT NULL,
	"nickname_override" text,
	"photo_override" text,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_attendees" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"booking_status" "booking_status" DEFAULT 'not_yet' NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "activity_results" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"day" timestamp,
	"metric" text NOT NULL,
	"value" text NOT NULL,
	"unit" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "award_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"award_definition_id" text NOT NULL,
	"voter_id" text NOT NULL,
	"nominee_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "awards" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"award_definition_id" text NOT NULL,
	"winner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_sends" (
	"id" text PRIMARY KEY NOT NULL,
	"circuit_id" text NOT NULL,
	"event_id" text,
	"stage" integer NOT NULL,
	"ai_quote" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_itinerary" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"day" timestamp NOT NULL,
	"theme_name" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "event_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"proposed_by" text NOT NULL,
	"dates" text,
	"location" text,
	"activity" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"circuit_id" text NOT NULL,
	"organizer_id" text,
	"name" text NOT NULL,
	"year" integer NOT NULL,
	"location" text,
	"mountains" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" "event_status" DEFAULT 'planning' NOT NULL,
	"sealed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"paid_by" text NOT NULL,
	"description" text NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lore_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"author_id" text NOT NULL,
	"type" "lore_entry_type" NOT NULL,
	"content" text,
	"media_url" text,
	"location" text,
	"is_hall_of_fame" boolean DEFAULT false NOT NULL,
	"day" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"proposal_id" text NOT NULL,
	"user_id" text NOT NULL,
	"vote" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" text,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"nationality" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "circuit_award_definitions" ADD CONSTRAINT "circuit_award_definitions_circuit_id_circuits_id_fk" FOREIGN KEY ("circuit_id") REFERENCES "public"."circuits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circuits" ADD CONSTRAINT "circuits_sponsor_id_users_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circuit_members" ADD CONSTRAINT "circuit_members_circuit_id_circuits_id_fk" FOREIGN KEY ("circuit_id") REFERENCES "public"."circuits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circuit_members" ADD CONSTRAINT "circuit_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_results" ADD CONSTRAINT "activity_results_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_results" ADD CONSTRAINT "activity_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_votes" ADD CONSTRAINT "award_votes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_votes" ADD CONSTRAINT "award_votes_voter_id_users_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_votes" ADD CONSTRAINT "award_votes_nominee_id_users_id_fk" FOREIGN KEY ("nominee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_sends" ADD CONSTRAINT "call_sends_circuit_id_circuits_id_fk" FOREIGN KEY ("circuit_id") REFERENCES "public"."circuits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_sends" ADD CONSTRAINT "call_sends_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_itinerary" ADD CONSTRAINT "daily_itinerary_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD CONSTRAINT "event_proposals_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD CONSTRAINT "event_proposals_proposed_by_users_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_circuit_id_circuits_id_fk" FOREIGN KEY ("circuit_id") REFERENCES "public"."circuits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lore_entries" ADD CONSTRAINT "lore_entries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lore_entries" ADD CONSTRAINT "lore_entries_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_votes" ADD CONSTRAINT "proposal_votes_proposal_id_event_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."event_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_votes" ADD CONSTRAINT "proposal_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;