-- Ensure user_profiles has the columns required by settings and webhooks
-- Created: 2025-11-29

BEGIN;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS slack_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS api_key TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Make sure slack_enabled has a default value and not null for existing rows
UPDATE public.user_profiles SET slack_enabled = FALSE WHERE slack_enabled IS NULL;

COMMIT;
