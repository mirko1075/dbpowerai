/*
  # Add origin column to queries table

  1. Purpose
    - Unify queries from manual form and external webhook
    - Add origin tracking to distinguish between form and webhook queries
    - Add origin='deleted_user' for queries from deleted accounts

  2. Changes
    - Add origin column to queries table
    - Set default origin='form' for existing queries
    - Add CHECK constraint for valid origin values
    - Add index for efficient filtering

  3. Compatibility
    - Existing queries get origin='form' by default
    - Dashboard can filter by origin
    - Webhook will use origin='webhook'
*/

-- Add origin column to queries table
ALTER TABLE queries
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'form'
  CHECK (origin IN ('form', 'webhook', 'deleted_user'));

-- Add index for efficient filtering by origin
CREATE INDEX IF NOT EXISTS queries_origin_idx ON queries(origin);

-- Update comment for documentation
COMMENT ON COLUMN queries.origin IS 'Source of the query: form (manual analysis), webhook (external API), or deleted_user (anonymized)';
