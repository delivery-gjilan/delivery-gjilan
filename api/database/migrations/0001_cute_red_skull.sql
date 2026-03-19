CREATE TYPE "public"."settlement_request_status" AS ENUM('PENDING_APPROVAL', 'ACCEPTED', 'DISPUTED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "settlement_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"requested_by_user_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"note" text,
	"status" "settlement_request_status" DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"responded_at" timestamp with time zone,
	"responded_by_user_id" uuid,
	"dispute_reason" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settlement_requests" ADD CONSTRAINT "settlement_requests_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_requests" ADD CONSTRAINT "settlement_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_requests" ADD CONSTRAINT "settlement_requests_responded_by_user_id_users_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_settlement_requests_business_id" ON "settlement_requests" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_settlement_requests_status" ON "settlement_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_settlement_requests_created_at" ON "settlement_requests" USING btree ("created_at");