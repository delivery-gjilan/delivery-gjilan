ALTER TABLE "orders" ALTER COLUMN "order_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_date" SET DEFAULT now();