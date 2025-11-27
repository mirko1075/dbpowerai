/*
  # Fix RLS Performance Issues for queries table

  1. Changes
    - Drop existing RLS policies that re-evaluate auth functions for each row
    - Create optimized RLS policies using (select auth.uid()) pattern
    - This improves query performance at scale by evaluating auth once per query

  2. Security
    - Maintains same security guarantees
    - Users can only access their own queries
    - Optimized for better performance
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own queries" ON queries;
DROP POLICY IF EXISTS "Users can insert own queries" ON queries;
DROP POLICY IF EXISTS "Users can update own queries" ON queries;
DROP POLICY IF EXISTS "Users can delete own queries" ON queries;

-- Create optimized RLS policies using (select auth.uid())
CREATE POLICY "Users can view own queries"
  ON queries
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own queries"
  ON queries
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own queries"
  ON queries
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own queries"
  ON queries
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
