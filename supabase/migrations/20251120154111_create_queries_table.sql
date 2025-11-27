/*
  # Create queries table

  1. New Tables
    - `queries`
      - `id` (uuid, primary key) - Unique identifier for each query
      - `user_id` (uuid, required) - References auth.users, cascades on delete
      - `raw_query` (text, required) - Original user query
      - `optimized_query` (text, nullable) - AI-optimized version of the query
      - `suggested_indexes` (text, nullable) - Suggested database indexes
      - `bottleneck` (text, nullable) - Identified performance bottlenecks
      - `db_type` (text, required) - Database type (postgres, mysql, etc.)
      - `created_at` (timestamp) - Record creation timestamp

  2. Indexes
    - Index on `user_id` for efficient user-specific queries
    - Index on `created_at` for chronological sorting

  3. Security
    - Enable RLS on `queries` table
    - Add policy for users to read only their own queries
    - Add policy for users to insert their own queries
    - Add policy for users to update their own queries
    - Add policy for users to delete their own queries
*/

-- Create queries table
CREATE TABLE IF NOT EXISTS queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_query text NOT NULL,
  optimized_query text,
  suggested_indexes text,
  bottleneck text,
  db_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON queries(created_at);

-- Enable RLS
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own queries"
  ON queries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queries"
  ON queries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queries"
  ON queries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own queries"
  ON queries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
