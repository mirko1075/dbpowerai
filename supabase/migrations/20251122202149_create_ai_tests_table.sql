/*
  # Create AI Tests Table

  1. New Tables
    - `ai_tests`
      - `id` (bigserial, primary key)
      - `created_at` (timestamptz, default now)
      - `created_by` (uuid, references auth.users)
      - `query` (text)
      - `schema` (text, nullable)
      - `explain` (text, nullable)
      - `test_type` (text, nullable)
      - `status` (text, nullable)
      - `attempts` (int, nullable)
      - `original_query` (text, nullable)
      - `rewritten_query` (text, nullable)
      - `validator_explanation` (text, nullable)
      - `result` (jsonb, nullable)

  2. Security
    - Enable RLS
    - Admin: full read/write access
    - Users: no access
*/

CREATE TABLE IF NOT EXISTS ai_tests (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  query TEXT NOT NULL,
  schema TEXT,
  explain TEXT,
  test_type TEXT,
  status TEXT,
  attempts INT,
  original_query TEXT,
  rewritten_query TEXT,
  validator_explanation TEXT,
  result JSONB
);

-- Enable RLS
ALTER TABLE ai_tests ENABLE ROW LEVEL SECURITY;

-- Admin can read all tests
CREATE POLICY "Admin can read all ai_tests"
  ON ai_tests
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admin can insert tests
CREATE POLICY "Admin can insert ai_tests"
  ON ai_tests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admin can update tests
CREATE POLICY "Admin can update ai_tests"
  ON ai_tests
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admin can delete tests
CREATE POLICY "Admin can delete ai_tests"
  ON ai_tests
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_tests_created_at ON ai_tests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tests_status ON ai_tests(status);
CREATE INDEX IF NOT EXISTS idx_ai_tests_created_by ON ai_tests(created_by);
