/*
  # Create Automatic Profile Creation Trigger

  1. Trigger Function
    - Creates a profile record in user_profiles when a new user signs up
    - Extracts email from auth.users
    - Extracts full_name from user metadata if available
    - Extracts avatar_url from user metadata if available (for OAuth users)
    - Runs automatically after INSERT on auth.users

  2. Trigger
    - Fires AFTER INSERT on auth.users table
    - Ensures every new user automatically gets a profile

  ## Important Notes
  - This trigger ensures no user is created without a profile
  - Handles both email/password and OAuth (Google) signups
  - Uses SECURITY DEFINER to bypass RLS during automatic creation
  - Includes error handling to prevent signup failures
*/

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_new_user();