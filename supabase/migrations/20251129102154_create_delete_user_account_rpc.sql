/*
  # Create delete_user_account RPC Function

  1. Purpose
    - Provides SECURITY DEFINER function to soft delete user data
    - Anonymizes user profile
    - Detaches query history from user
    - Bypasses RLS for deletion operations

  2. Function Behavior
    - Soft deletes user_profiles (sets deleted_at, nullifies personal data)
    - Anonymizes query_history (sets user_id = NULL, origin = 'deleted_user')
    - Returns success/failure status

  3. Security
    - SECURITY DEFINER runs with elevated privileges
    - Only callable via Edge Functions (service_role)
    - Edge Function validates user can only delete own account
*/

-- Create the delete_user_account function
CREATE OR REPLACE FUNCTION delete_user_account(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Step 1: Soft delete and anonymize user profile
  UPDATE user_profiles
  SET
    deleted_at = NOW(),
    full_name = NULL,
    slack_webhook_url = NULL,
    slack_enabled = FALSE,
    api_key = NULL
  WHERE id = user_id;

  -- Check if user was found
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User profile not found'
    );
  END IF;

  -- Step 2: Anonymize query history
  UPDATE query_history
  SET
    user_id = NULL,
    origin = 'deleted_user'
  WHERE user_id = user_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'User account soft deleted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to delete user account',
      'details', SQLERRM
    );
END;
$$;

-- Restrict execution to service_role only
-- This ensures only Edge Functions with SERVICE_ROLE_KEY can call this
REVOKE EXECUTE ON FUNCTION delete_user_account(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION delete_user_account IS 'Soft deletes user profile and anonymizes query history. Only callable by service_role via Edge Functions.';
