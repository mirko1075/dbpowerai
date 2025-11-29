/*
  # Add Settings Features - Slack, API Keys, Query History

  1. Purpose
    - Add Slack integration columns to user_profiles
    - Add API key management column to user_profiles
    - Create unified query_history table
    - Add RLS policies for query_history

  2. Changes
    - user_profiles: slack_webhook_url, slack_enabled, api_key
    - query_history table with origin tracking (form/webhook/deleted_user)
    - RLS policies for secure access

  3. Security
    - API keys are unique
    - Query history protected by RLS
    - Users can only see their own queries
    - Service role can manage all queries
*/

-- Add Slack and API key columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS slack_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS api_key TEXT;

-- Add unique constraint and index for API keys
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_api_key_key ON user_profiles(api_key) WHERE api_key IS NOT NULL;

-- Create query_history table
CREATE TABLE IF NOT EXISTS query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  sql TEXT NOT NULL,
  database_schema TEXT,
  severity TEXT,
  analysis_result JSONB,
  execution_plan JSONB,
  origin TEXT NOT NULL CHECK (origin IN ('form', 'webhook', 'deleted_user')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add index for query_history lookups
CREATE INDEX IF NOT EXISTS query_history_user_id_idx ON query_history(user_id);
CREATE INDEX IF NOT EXISTS query_history_created_at_idx ON query_history(created_at DESC);
CREATE INDEX IF NOT EXISTS query_history_origin_idx ON query_history(origin);

-- Enable RLS on query_history
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own queries
CREATE POLICY "Users can view own queries"
  ON query_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all queries
CREATE POLICY "Service role can manage all queries"
  ON query_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON query_history TO authenticated;
GRANT ALL ON query_history TO service_role;
