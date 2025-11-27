/*
  # Update Signup Trigger for Early Adopter Plan Assignment

  ## Overview
  Modifies the automatic plan assignment on user signup to support
  date-based early adopter access.

  ## Logic
  
  ### If signup date is on or before December 31, 2025:
  - Assign plan = 'early_adopter'
  - Set analysis_limit = 500
  - Set token_limit = 500000
  - Set early_expires_at = '2025-12-31 23:59:59+00'
  
  ### If signup date is after December 31, 2025:
  - Assign plan = 'free'
  - Set analysis_limit = 20
  - Set token_limit = 40000
  - Set early_expires_at = NULL
  
  ## Impact
  - New signups before 2026 automatically receive early adopter benefits
  - Seamless transition to free plan for signups after December 31, 2025
  - No frontend changes needed
  
  ## Security
  - Function runs with SECURITY DEFINER to access auth.users
  - Maintains existing conflict handling (ON CONFLICT DO NOTHING)
*/

-- Replace the signup trigger function with date-aware version
CREATE OR REPLACE FUNCTION public.create_free_plan_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cutoff_date timestamptz := '2025-12-31 23:59:59+00'::timestamptz;
BEGIN
  -- Check if we're still in early adopter period
  IF now() <= cutoff_date THEN
    -- Assign early_adopter plan for signups before Dec 31, 2025
    INSERT INTO public.user_plans (
      user_id,
      plan,
      analysis_limit,
      token_limit,
      early_expires_at
    )
    VALUES (
      NEW.id,
      'early_adopter',
      500,
      500000,
      cutoff_date
    )
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    -- Assign free plan for signups after Dec 31, 2025
    INSERT INTO public.user_plans (
      user_id,
      plan,
      analysis_limit,
      token_limit,
      early_expires_at
    )
    VALUES (
      NEW.id,
      'free',
      20,
      40000,
      NULL
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger remains the same (already attached to auth.users)
-- Just ensuring it exists
DROP TRIGGER IF EXISTS create_free_plan_on_signup ON auth.users;
CREATE TRIGGER create_free_plan_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_free_plan_for_new_user();

COMMENT ON FUNCTION public.create_free_plan_for_new_user() IS
  'Auto-assigns early_adopter plan (500/500k) for signups before Dec 31, 2025, then switches to free plan (20/40k) after.';
