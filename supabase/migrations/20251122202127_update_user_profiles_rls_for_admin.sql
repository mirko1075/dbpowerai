/*
  # Update User Profiles RLS for Admin Access

  1. Changes
    - Drop existing policies
    - Create new policies:
      - Users can read/write their own profile
      - Admins can read/write all profiles

  2. Security
    - Role-based access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Users can read their own profile OR admin can read all
CREATE POLICY "Users can read own profile or admin reads all"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Users can update their own profile OR admin can update all
CREATE POLICY "Users can update own profile or admin updates all"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    auth.uid() = id OR
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
