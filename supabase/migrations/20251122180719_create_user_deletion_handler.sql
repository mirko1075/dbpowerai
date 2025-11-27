/*
  # User Deletion Handler

  1. Function
    - `public.handle_user_deleted()` - Cascades deletion from auth.users to public schema tables
    - Uses SECURITY DEFINER to allow deletion across schemas
    - Removes user data from user_profiles, user_plans, and subscriptions

  2. Trigger
    - `on_auth_user_deleted` - Fires after user deletion in auth.users
    - Automatically cleans up related data in public schema

  3. Security
    - SECURITY DEFINER allows function to execute with elevated privileges
    - search_path restricts to public schema and temp tables only
*/

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Create the deletion handler function
CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Delete from user_profiles
  DELETE FROM public.user_profiles WHERE id = OLD.id;
  
  -- Delete from user_plans
  DELETE FROM public.user_plans WHERE user_id = OLD.id;
  
  -- Delete from subscriptions (if table exists)
  DELETE FROM public.subscriptions WHERE user_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_deleted();
