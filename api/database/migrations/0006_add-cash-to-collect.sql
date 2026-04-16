-- Migration: add cash_to_collect column for DIRECT_DISPATCH orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cash_to_collect" numeric(10,2);
