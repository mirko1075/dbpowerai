/*
  # Add Early Adopter Plan Support

  ## Overview
  Extends the user_plans table to support the early_adopter plan type.
  This plan offers generous limits (500 analyses, 500k tokens) for users
  who sign up before December 31, 2025.

  ## Changes
  
  ### Schema Updates
  - Add `early_expires_at` column to track when early adopter access expires
  - Extend `plan` CHECK constraint to include 'early_adopter'
  - Add index on `early_expires_at` for efficient expiration queries
  
  ### Early Adopter Plan Details
  - Plan: 'early_adopter'
  - Analysis Limit: 500 analyses/month
  - Token Limit: 500,000 tokens/month
  - Expires: December 31, 2025
  
  ## Security
  - No RLS changes needed (inherits existing policies)
  - Service role maintains full access for automated expiration
*/

-- Add early_expires_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_plans' AND column_name = 'early_expires_at'
  ) THEN
    ALTER TABLE public.user_plans
    ADD COLUMN early_expires_at timestamptz;
  END IF;
END $$;

-- Update CHECK constraint to include early_adopter
ALTER TABLE public.user_plans
DROP CONSTRAINT IF EXISTS user_plans_plan_check;

ALTER TABLE public.user_plans
ADD CONSTRAINT user_plans_plan_check
CHECK (plan IN ('free', 'web', 'api', 'early_adopter'));

-- Create index for expiration queries
CREATE INDEX IF NOT EXISTS idx_user_plans_early_expires_at
ON public.user_plans(early_expires_at)
WHERE early_expires_at IS NOT NULL;

-- Update table comment
COMMENT ON TABLE public.user_plans IS
  'Tracks user plan limits and usage. Plans: free (20/40k), web (100/80k), api (TBD), early_adopter (500/500k until Dec 31, 2025).';

COMMENT ON COLUMN public.user_plans.early_expires_at IS
  'Expiration date for early_adopter plan. NULL for other plan types.';
