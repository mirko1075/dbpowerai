/*
  # Create LLM Validation Failures Table

  1. New Tables
    - `llm_validation_failures`
      - `id` (bigserial, primary key)
      - `created_at` (timestamptz, default now)
      - `original_query` (text)
      - `attempted_rewrite` (text)
      - `validator_explanation` (text)

  2. Security
    - Enable RLS on `llm_validation_failures` table
    - Add policy for service role only (admin access)

  3. Purpose
    - Log failed semantic validation attempts from the analyzer
    - Track LLM rewrites that don't pass validation
    - Help improve the validation system
*/

CREATE TABLE IF NOT EXISTS llm_validation_failures (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  original_query TEXT NOT NULL,
  attempted_rewrite TEXT NOT NULL,
  validator_explanation TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE llm_validation_failures ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (admin only)
CREATE POLICY "Service role can read validation failures"
  ON llm_validation_failures
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert validation failures"
  ON llm_validation_failures
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_llm_validation_failures_created_at
  ON llm_validation_failures(created_at DESC);
