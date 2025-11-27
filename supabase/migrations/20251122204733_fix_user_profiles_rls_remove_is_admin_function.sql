/*
  # Fix User Profiles RLS - Remove is_admin() Function References

  1. Problem
    - Policies reference is_admin() function which doesn't exist
    - Causes 500 errors when querying user_profiles

  2. Solution
    - Drop all policies completely
    - Recreate with simple auth.uid() checks only
    - Admin operations use service_role which bypasses RLS

  3. Security
    - Users can only access their own profile
    - Admins use service_role for elevated access
*/

-- Drop ALL existing policies on user_profiles
DROP POLICY IF EXISTS "Users can read own profile or admin reads all" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile or admin updates all" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create simple policies - users can only access their own data
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Note: Admin access is handled via service_role which bypasses RLS entirely
