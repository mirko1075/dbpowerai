/*
  # Fix User Profiles RLS Circular Dependency

  1. Problem
    - Current policies check role from user_profiles, causing circular dependency
    - Users cannot read their own profile on first load

  2. Solution
    - Use simpler policies that allow users to access their own data
    - Create separate admin-only policies using service_role
    - Remove circular lookups

  3. Changes
    - Drop existing policies
    - Create new non-circular policies
    - Admin access via service_role bypass RLS
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own profile or admin reads all" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile or admin updates all" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile (except role field)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    (role IS NULL OR role = (SELECT role FROM user_profiles WHERE id = auth.uid()))
  );

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Note: Admin access is handled via service_role which bypasses RLS
-- Admin operations should use the service role key, not user JWT
