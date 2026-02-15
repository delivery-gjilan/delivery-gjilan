ALTER TABLE "drivers" DROP CONSTRAINT "drivers_email_unique";--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "password";--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "first_name";--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "last_name";--> statement-breakpoint
ALTER TABLE "drivers" DROP COLUMN "phone_number";--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_unique" UNIQUE("user_id");