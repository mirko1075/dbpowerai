/*
  # Create soft_delete_user Function for Account Deletion

  1. Purpose
    - Provides a SECURITY DEFINER function to bypass RLS for account deletion
    - Implements soft delete with anonymization for GDPR compliance
    - Updates multiple tables in a single transaction

  2. Changes
    - Add soft delete columns to user_profiles, ai_tests, user_plans, query_history
    - Create soft_delete_user function with email anonymization
    - Restrict function execution to service_role only

  3. Security
    - SECURITY DEFINER runs with postgres/admin privileges
    - Only callable by service_role (Edge Functions with SERVICE_ROLE_KEY)
    - User identity validated by Edge Function before calling
*/

-- Add soft delete columns to all tables (IF NOT EXISTS for safety)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT;

ALTER TABLE ai_tests
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE query_history
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create soft delete function with anonymization
CREATE OR REPLACE FUNCTION soft_delete_user(p_user_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Soft delete user profile with anonymization
  UPDATE user_profiles
  SET
    email = CONCAT('deleted+', SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8), '@example.invalid'),
    full_name = 'deleted user',
    is_deleted = TRUE,
    deleted_at = NOW(),
    deleted_reason = p_reason
  WHERE id = p_user_id;

  -- Soft delete related records
  UPDATE ai_tests
  SET is_deleted = TRUE, deleted_at = NOW()
  WHERE user_id = p_user_id;

  UPDATE user_plans
  SET is_deleted = TRUE, deleted_at = NOW()
  WHERE user_id = p_user_id;

  UPDATE query_history
  SET is_deleted = TRUE, deleted_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Restrict execution to service_role only
-- This ensures only Edge Functions with SERVICE_ROLE_KEY can call this function
REVOKE EXECUTE ON FUNCTION soft_delete_user(UUID, TEXT) FROM anon, authenticated;

-- Grant execute to service_role
GRANT EXECUTE ON FUNCTION soft_delete_user(UUID, TEXT) TO service_role;
