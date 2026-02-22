-- First, convert role column to text so we can modify values freely
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER'::text;--> statement-breakpoint
-- Now update existing BUSINESS_ADMIN users to BUSINESS_OWNER (safe because column is text)
UPDATE "users" SET "role" = 'BUSINESS_OWNER' WHERE "role" = 'BUSINESS_ADMIN';--> statement-breakpoint
-- Drop old enum and create new one with updated values
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CUSTOMER', 'DRIVER', 'SUPER_ADMIN', 'ADMIN', 'BUSINESS_OWNER', 'BUSINESS_EMPLOYEE');--> statement-breakpoint
-- Convert column back to the new enum type
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";