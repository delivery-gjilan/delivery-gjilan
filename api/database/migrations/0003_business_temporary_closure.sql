ALTER TABLE "businesses"
ADD COLUMN "is_temporarily_closed" boolean NOT NULL DEFAULT false;

ALTER TABLE "businesses"
ADD COLUMN "temporary_closure_reason" varchar(500);
