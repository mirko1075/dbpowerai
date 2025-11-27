/*
  # Assign Early Adopter Plan to All Existing Users

  ## Overview
  One-time migration that upgrades all existing users to the early_adopter plan.
  This rewards early users with generous limits until December 31, 2025.

  ## Changes
  
  ### Updates Applied to ALL Existing Users
  - plan = 'early_adopter'
  - analysis_limit = 500 (increased from 20)
  - token_limit = 500000 (increased from 40,000)
  - analysis_used = 0 (reset usage)
  - token_used = 0 (reset token usage)
  - early_expires_at = '2025-12-31 23:59:59+00'
  - period_start = now() (reset billing period)
  
  ## Impact
  - All existing users immediately receive 500 analyses and 500k tokens per month
  - Access valid until December 31, 2025
  - Usage counters reset to give everyone a fresh start
  
  ## Notes
  - This migration runs only once
  - After expiration, users will be automatically downgraded to free plan
  - No data loss - only limit increases and usage resets
*/

-- Update all existing users to early_adopter plan
UPDATE public.user_plans
SET
  plan = 'early_adopter',
  analysis_limit = 500,
  token_limit = 500000,
  analysis_used = 0,
  token_used = 0,
  early_expires_at = '2025-12-31 23:59:59+00'::timestamptz,
  period_start = now(),
  updated_at = now()
WHERE plan IN ('free', 'web', 'api');

-- Log the update
DO $$
DECLARE
  updated_count integer;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.user_plans
  WHERE plan = 'early_adopter';
  
  RAISE NOTICE 'Early Adopter Plan Migration Complete: % users upgraded', updated_count;
END $$;
