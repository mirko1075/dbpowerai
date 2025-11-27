/*
  # Replace User Deletion Handler with Soft Delete Logic

  1. Function: handle_user_deleted()
    - Performs soft delete on user_profiles (sets is_deleted=true, anonymizes data)
    - Performs soft delete on user_plans (sets is_deleted=true, resets to deleted plan)
    - Sends webhook to Make.com for user deletion notification

  2. Security
    - SECURITY DEFINER allows function to execute with elevated privileges
    - search_path restricts to public schema and temp tables only

  3. Trigger
    - Creates trigger on auth.users AFTER DELETE
    - Automatically calls handle_user_deleted() when user is removed from auth
*/

-- Create or replace the soft delete handler function
CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Soft delete in user_profiles
  UPDATE public.user_profiles
  SET is_deleted = true,
      deleted_at = now(),
      full_name = 'Deleted User',
      email = 'deleted_' || OLD.id || '@deleted.local',
      avatar_url = NULL
  WHERE id = OLD.id;

  -- Soft delete in user_plans
  UPDATE public.user_plans
  SET is_deleted = true,
      deleted_at = now(),
      plan = 'deleted',
      analysis_limit = 0,
      token_limit = 0,
      analysis_used = 0,
      token_used = 0
  WHERE user_id = OLD.id;

  -- Notify Make.com (user deleted) – Replace with real webhook URL
  PERFORM net.http_post(
    url := 'https://hook.eu2.make.com/REPLACE_WITH_USER_DELETED_WEBHOOK',
    body := jsonb_build_object(
      'event', 'user_deleted',
      'user_id', OLD.id,
      'deleted_at', now()
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );

  RETURN OLD;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_deleted();
