/*
  # Create User Plans Table for Usage Limits

  ## Overview
  Implements plan-based usage limits for DBPowerAI with three tiers:
  - Free Plan: 20 analyses/month, 40k tokens
  - Web Plan: 100 analyses/month, 80k tokens  
  - API Plan: Coming soon (placeholder)

  ## Tables
  
  ### user_plans
  Tracks each user's current plan, usage, and limits
  
  Columns:
  - id: Primary key
  - user_id: Reference to auth.users
  - plan: Plan type ('free', 'web', 'api')
  - analysis_used: Current month's analysis count
  - analysis_limit: Max analyses allowed per month
  - token_used: Current month's token usage
  - token_limit: Max tokens allowed per month
  - period_start: Start of current billing/usage period
  - created_at: Account creation timestamp
  - updated_at: Last modification timestamp

  ## Security
  - RLS enabled
  - Users can only read their own plan data
  - Service role can manage all plans (for webhooks/admin)
  
  ## Indexes
  - user_id for fast lookups
  - plan for analytics
*/

-- Create user_plans table
CREATE TABLE IF NOT EXISTS public.user_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'web', 'api')),
  analysis_used integer NOT NULL DEFAULT 0,
  analysis_limit integer NOT NULL DEFAULT 20,
  token_used integer NOT NULL DEFAULT 0,
  token_limit integer NOT NULL DEFAULT 40000,
  period_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- Users can read their own plan
CREATE POLICY "Users can read own plan"
  ON public.user_plans
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Service role can manage all plans (for Stripe webhooks, admin operations)
CREATE POLICY "Service role can manage plans"
  ON public.user_plans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON public.user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_plan ON public.user_plans(plan);
CREATE INDEX IF NOT EXISTS idx_user_plans_period_start ON public.user_plans(period_start);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_user_plans_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_plans_timestamp
  BEFORE UPDATE ON public.user_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_plans_updated_at();

-- Function to auto-create free plan on user signup
CREATE OR REPLACE FUNCTION public.create_free_plan_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan, analysis_limit, token_limit)
  VALUES (NEW.id, 'free', 20, 40000)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create free plan on signup
DROP TRIGGER IF EXISTS create_free_plan_on_signup ON auth.users;
CREATE TRIGGER create_free_plan_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_free_plan_for_new_user();

-- Backfill existing users with free plan
INSERT INTO public.user_plans (user_id, plan, analysis_limit, token_limit)
SELECT id, 'free', 20, 40000
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Function to reset monthly usage (to be called by cron or manually)
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Reset usage for plans where period is older than 30 days
  UPDATE public.user_plans
  SET 
    analysis_used = 0,
    token_used = 0,
    period_start = now()
  WHERE period_start < now() - INTERVAL '30 days';
END;
$$;

COMMENT ON TABLE public.user_plans IS 
  'Tracks user plan limits and usage. Free: 20 analyses/40k tokens, Web: 100 analyses/80k tokens per month.';

COMMENT ON FUNCTION public.reset_monthly_usage() IS 
  'Resets monthly usage counters for all users. Should be called by a cron job or edge function monthly.';
