/*
  # Create user_events Analytics Table

  1. New Tables
    - `user_events`
      - `id` (uuid, primary key) - Unique event identifier
      - `user_id` (uuid, not null) - Reference to auth.users
      - `event` (text, not null) - Event name/type (e.g., "login", "submit_query")
      - `metadata` (jsonb) - Additional event data in JSON format
      - `created_at` (timestamptz) - Event timestamp

  2. Indexes
    - Composite index on (user_id, created_at) for efficient event queries

  3. Security
    - Enable RLS on `user_events` table
    - Policy 1: Users can insert their own events only
    - Policy 2: No SELECT access (admin access via service role only)
    
  ## Important Notes
  - This table is write-only for authenticated users
  - Admin reads must use service role key to bypass RLS
  - Metadata field stores flexible JSON data for event-specific details
*/

-- Create the user_events table
CREATE TABLE IF NOT EXISTS user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient queries by user and time
CREATE INDEX IF NOT EXISTS idx_user_events_user_id_created_at
ON user_events (user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can insert their own events
CREATE POLICY "Users can insert their own events"
  ON user_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Deny all SELECT operations (admin must use service role)
CREATE POLICY "No one can select events"
  ON user_events
  FOR SELECT
  TO authenticated
  USING (false);