CREATE TABLE "store_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"is_store_closed" boolean DEFAULT false NOT NULL,
	"closed_message" text DEFAULT 'We are too busy at the moment. Please come back later!',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
