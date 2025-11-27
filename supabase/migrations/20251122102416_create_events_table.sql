/*
  # Create Events Tracking Table

  1. New Tables
    - `events`
      - `id` (uuid, primary key) - Unique event identifier
      - `type` (text, not null) - Event type (e.g., user_clicked_subscribe, page_view)
      - `session_id` (text) - Anonymous session identifier from localStorage
      - `user_id` (uuid) - Authenticated user ID (null for anonymous)
      - `metadata` (jsonb) - Additional event data (page, query length, etc.)
      - `created_at` (timestamptz) - Event timestamp

  2. Security
    - Enable RLS on `events` table
    - Add policy for service role to insert events
    - Add policy for authenticated users to read their own events

  3. Indexes
    - Index on `type` for filtering by event type
    - Index on `user_id` for user-specific queries
    - Index on `session_id` for anonymous tracking
    - Index on `created_at` for time-based queries
*/

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  session_id text,
  user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert events (used by edge function)
CREATE POLICY "Service role can insert events"
  ON events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow authenticated users to read their own events
CREATE POLICY "Users can read own events"
  ON events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to read all events (assuming you have an admin role)
CREATE POLICY "Admins can read all events"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);