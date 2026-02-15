ALTER TABLE "drivers" ADD COLUMN "commission_percentage" numeric DEFAULT 0 NOT NULL;

CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar NOT NULL,
	"driver_id" uuid REFERENCES "drivers"("id") ON DELETE SET NULL,
	"business_id" uuid REFERENCES "businesses"("id") ON DELETE SET NULL,
	"order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
	"amount" numeric(10, 2) NOT NULL,
	"status" varchar DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX "idx_settlements_driver_id" on "settlements"("driver_id");
CREATE INDEX "idx_settlements_business_id" on "settlements"("business_id");
CREATE INDEX "idx_settlements_order_id" on "settlements"("order_id");
CREATE INDEX "idx_settlements_status" on "settlements"("status");
