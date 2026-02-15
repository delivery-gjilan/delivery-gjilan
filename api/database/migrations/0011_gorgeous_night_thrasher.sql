ALTER TABLE "drivers" DROP CONSTRAINT "drivers_user_id_unique";--> statement-breakpoint
ALTER TABLE "drivers" DROP CONSTRAINT "drivers_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "password" text NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "first_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "last_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_email_unique" UNIQUE("email");