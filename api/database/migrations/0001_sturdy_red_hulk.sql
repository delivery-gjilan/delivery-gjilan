ALTER TABLE "user_referrals" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "user_referrals" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_referral_code_unique";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "referral_code";--> statement-breakpoint
DROP TYPE "public"."referral_status";