-- Add first-class Albanian locale fields to notification_campaigns
ALTER TABLE notification_campaigns ADD COLUMN IF NOT EXISTS title_al text;
ALTER TABLE notification_campaigns ADD COLUMN IF NOT EXISTS body_al text;
