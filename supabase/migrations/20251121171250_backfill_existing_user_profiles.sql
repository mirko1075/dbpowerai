/*
  # Backfill Profiles for Existing Users

  1. Purpose
    - Creates profile records for any existing users who don't have one yet
    - Ensures all users in auth.users have corresponding entries in user_profiles
    - Handles historical data migration

  2. Process
    - Selects all users from auth.users who don't have a profile
    - Creates profile records with email and metadata from auth.users
    - Safe to run multiple times (idempotent)

  ## Important Notes
  - This migration is safe to run on databases with no existing users
  - Uses INSERT ... ON CONFLICT DO NOTHING for safety
  - Copies metadata (full_name, avatar_url) from auth.users if available
*/

-- Insert profiles for all existing users who don't have one
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  avatar_url,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', NULL),
  COALESCE(au.raw_user_meta_data->>'avatar_url', NULL),
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.id = au.id
)
ON CONFLICT (id) DO NOTHING;