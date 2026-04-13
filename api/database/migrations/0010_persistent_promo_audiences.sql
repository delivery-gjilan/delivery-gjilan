CREATE TABLE "promotion_audience_groups" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" uuid,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint

CREATE TABLE "promotion_audience_group_members" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "group_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint

ALTER TABLE "promotion_audience_groups"
ADD CONSTRAINT "promotion_audience_groups_created_by_users_id_fk"
FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "promotion_audience_group_members"
ADD CONSTRAINT "promotion_audience_group_members_group_id_promotion_audience_groups_id_fk"
FOREIGN KEY ("group_id") REFERENCES "public"."promotion_audience_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "promotion_audience_group_members"
ADD CONSTRAINT "promotion_audience_group_members_user_id_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "idx_promotion_audience_groups_name" ON "promotion_audience_groups" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_promotion_audience_groups_active" ON "promotion_audience_groups" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_promotion_audience_group_members_group" ON "promotion_audience_group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_promotion_audience_group_members_user" ON "promotion_audience_group_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_promotion_audience_group_members_group_user" ON "promotion_audience_group_members" USING btree ("group_id","user_id");
