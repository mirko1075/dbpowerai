/*
  # Add Role Column to User Profiles

  1. Changes
    - Add `role` column to `user_profiles` table (TEXT, default 'user')
    - Set all existing users to role='user'
    - Promote mirko.siddi@gmail.com to role='admin'

  2. Security
    - Update RLS policies for admin access
*/

-- Add role column with default 'user'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role TEXT DEFAULT 'user';
  END IF;
END $$;

-- Ensure all existing users have role='user'
UPDATE user_profiles SET role = 'user' WHERE role IS NULL;

-- Promote mirko.siddi@gmail.com to admin
UPDATE user_profiles SET role = 'admin' WHERE email = 'mirko.siddi@gmail.com';
