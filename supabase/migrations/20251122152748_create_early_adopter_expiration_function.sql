/*
  # Create Early Adopter Plan Expiration Function

  ## Overview
  Creates a database function to automatically downgrade early_adopter users
  to the free plan after their access expires (December 31, 2025).

  ## Function: expire_early_adopter_plans()
  
  ### Purpose
  - Finds all users with expired early_adopter plans
  - Downgrades them to free plan with standard limits
  - Resets usage counters for the new billing period
  
  ### Changes Applied to Expired Users
  - plan = 'free'
  - analysis_limit = 20
  - token_limit = 40000
  - analysis_used = 0 (reset)
  - token_used = 0 (reset)
  - early_expires_at = NULL
  - period_start = now()
  
  ## Usage
  This function should be scheduled to run on January 1, 2026 via:
  - pg_cron extension
  - External cron job calling via API
  - Supabase edge function scheduled trigger
  
  ## Security
  - Runs with SECURITY DEFINER for necessary permissions
  - Returns count of affected users for monitoring
  - Idempotent - safe to run multiple times
*/

-- Create the expiration function
CREATE OR REPLACE FUNCTION public.expire_early_adopter_plans()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  affected_count integer;
BEGIN
  -- Update all early_adopter users whose access has expired
  UPDATE public.user_plans
  SET
    plan = 'free',
    analysis_limit = 20,
    token_limit = 40000,
    analysis_used = 0,
    token_used = 0,
    early_expires_at = NULL,
    period_start = now(),
    updated_at = now()
  WHERE
    plan = 'early_adopter'
    AND early_expires_at IS NOT NULL
    AND early_expires_at < now();
  
  -- Get count of affected users
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  -- Log the expiration
  RAISE NOTICE 'Early Adopter Expiration: % users downgraded to free plan', affected_count;
  
  RETURN affected_count;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION public.expire_early_adopter_plans() IS
  'Downgrades expired early_adopter plans to free plan. Schedule to run on Jan 1, 2026 via cron or edge function.';

-- Create a view to monitor upcoming expirations (helpful for analytics)
CREATE OR REPLACE VIEW public.early_adopter_expiration_status AS
SELECT
  COUNT(*) FILTER (WHERE early_expires_at > now()) as active_early_adopters,
  COUNT(*) FILTER (WHERE early_expires_at <= now()) as expired_early_adopters,
  MIN(early_expires_at) as earliest_expiration,
  MAX(early_expires_at) as latest_expiration
FROM public.user_plans
WHERE plan = 'early_adopter' AND early_expires_at IS NOT NULL;

COMMENT ON VIEW public.early_adopter_expiration_status IS
  'Monitoring view for early adopter plan status and upcoming expirations.';
