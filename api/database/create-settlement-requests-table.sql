-- Migration: settlement_requests table
-- Run this once against your database to add the settlement request/approval flow.

CREATE TYPE "public"."settlement_request_status" AS ENUM(
    'PENDING_APPROVAL',
    'ACCEPTED',
    'DISPUTED',
    'EXPIRED',
    'CANCELLED'
);

CREATE TABLE "settlement_requests" (
    "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "business_id"            uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
    "requested_by_user_id"   uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "amount"                 numeric(10, 2) NOT NULL,
    "currency"               varchar(3) DEFAULT 'EUR' NOT NULL,
    "period_start"           timestamp with time zone NOT NULL,
    "period_end"             timestamp with time zone NOT NULL,
    "note"                   text,
    "status"                 "settlement_request_status" DEFAULT 'PENDING_APPROVAL' NOT NULL,
    "responded_at"           timestamp with time zone,
    "responded_by_user_id"   uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "dispute_reason"         text,
    "expires_at"             timestamp with time zone NOT NULL,
    "created_at"             timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at"             timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX "idx_settlement_requests_business_id" ON "settlement_requests"("business_id");
CREATE INDEX "idx_settlement_requests_status"      ON "settlement_requests"("status");
CREATE INDEX "idx_settlement_requests_created_at"  ON "settlement_requests"("created_at");
