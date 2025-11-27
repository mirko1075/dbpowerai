/*
  # Create query_history table

  1. New Tables
    - `query_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `input_query` (text) - The SQL query submitted by the user
      - `analysis_result` (jsonb) - The full analysis result from AI
      - `created_at` (timestamptz) - When the analysis was performed
  
  2. Security
    - Enable RLS on `query_history` table
    - Add policy for users to read their own query history
    - Add policy for users to insert their own query history
  
  3. Indexes
    - Index on user_id for faster lookups
    - Index on created_at for ordering
*/

CREATE TABLE IF NOT EXISTS query_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_query text NOT NULL,
  analysis_result jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_query_history_user_id ON query_history(user_id);
CREATE INDEX IF NOT EXISTS idx_query_history_created_at ON query_history(created_at DESC);

-- Enable RLS
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own query history
CREATE POLICY "Users can view own query history"
  ON query_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own query history
CREATE POLICY "Users can insert own query history"
  ON query_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);