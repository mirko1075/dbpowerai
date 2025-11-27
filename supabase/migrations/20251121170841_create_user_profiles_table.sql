/*
  # Create user_profiles Table

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key) - References auth.users(id), user identifier
      - `email` (text, not null) - User email address
      - `full_name` (text, nullable) - User's full name
      - `avatar_url` (text, nullable) - URL to user's avatar image
      - `bio` (text, nullable) - User biography/description
      - `company` (text, nullable) - User's company name
      - `role` (text, nullable) - User role (e.g., 'developer', 'dba', 'admin')
      - `preferences` (jsonb) - User settings and preferences in JSON format
      - `created_at` (timestamptz) - Profile creation timestamp
      - `updated_at` (timestamptz) - Profile last update timestamp

  2. Indexes
    - Index on email for faster lookups
    - Index on created_at for sorting

  3. Security
    - Enable RLS on `user_profiles` table
    - Users can SELECT their own profile
    - Users can INSERT their own profile
    - Users can UPDATE their own profile
    - No DELETE policy (profiles should be kept for data integrity)

  ## Important Notes
  - This table stores extended user profile information beyond auth.users
  - The id column directly references auth.users(id) for 1:1 relationship
  - Automatic profile creation is handled by a trigger (see next migration)
  - Preferences field allows flexible storage of user settings
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  company TEXT,
  role TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on profile updates
CREATE TRIGGER update_user_profiles_updated_at_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();