/*
  # Fix Security Definer View

  1. Issue
    - View `early_adopter_expiration_status` has SECURITY DEFINER property
    - This is a security concern as views don't need elevated privileges
    - Only functions should use SECURITY DEFINER when necessary

  2. Solution
    - Recreate the view without SECURITY DEFINER
    - Standard view definition is sufficient for read-only aggregation
*/

-- Drop and recreate view without SECURITY DEFINER
DROP VIEW IF EXISTS public.early_adopter_expiration_status;

CREATE VIEW public.early_adopter_expiration_status AS
SELECT
  COUNT(*) FILTER (WHERE early_expires_at > now()) as active_early_adopters,
  COUNT(*) FILTER (WHERE early_expires_at <= now()) as expired_early_adopters,
  MIN(early_expires_at) as earliest_expiration,
  MAX(early_expires_at) as latest_expiration
FROM public.user_plans
WHERE plan = 'early_adopter' AND early_expires_at IS NOT NULL;

COMMENT ON VIEW public.early_adopter_expiration_status IS
  'Monitoring view for early adopter plan status and upcoming expirations.';
