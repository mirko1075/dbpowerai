/*
  # Fix RLS Performance and Security Issues

  1. RLS Performance Fixes
    - Update `events` table policies to use `(select auth.uid())` instead of `auth.uid()`
    - Update `query_history` table policies to use `(select auth.uid())` instead of `auth.uid()`
    - Prevents re-evaluation of auth functions for each row

  2. Remove Multiple Permissive Policies
    - Drop conflicting "No one can select events" policy from user_events
    - Keep only "Users can read their own events" policy

  3. Remove Unused Indexes
    - Drop indexes that are not being used by queries
    - Reduces database maintenance overhead

  4. Security Definer View
    - Keep as-is (needed for automated expiration checks)
*/

-- ============================================
-- Fix RLS Performance: events table
-- ============================================

DROP POLICY IF EXISTS "Users can read events" ON public.events;

CREATE POLICY "Users can read events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid()) = user_id) OR (( SELECT (auth.jwt() ->> 'email'::text)) ~~ '%@dbpowerai.com'::text));

-- ============================================
-- Fix RLS Performance: query_history table
-- ============================================

DROP POLICY IF EXISTS "Users can view own query history" ON public.query_history;

CREATE POLICY "Users can view own query history"
  ON public.query_history
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own query history" ON public.query_history;

CREATE POLICY "Users can insert own query history"
  ON public.query_history
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- Fix Multiple Permissive Policies: user_events
-- ============================================

DROP POLICY IF EXISTS "No one can select events" ON public.user_events;

-- Keep only: "Users can read their own events" policy
-- (already exists and properly scoped)

-- ============================================
-- Remove Unused Indexes
-- ============================================

DROP INDEX IF EXISTS public.idx_user_events_user_id_created_at;
DROP INDEX IF EXISTS public.idx_queries_created_at;
DROP INDEX IF EXISTS public.idx_free_tokens_used_at;
DROP INDEX IF EXISTS public.idx_events_type;
DROP INDEX IF EXISTS public.idx_events_user_id;
DROP INDEX IF EXISTS public.idx_events_session_id;
DROP INDEX IF EXISTS public.idx_events_created_at;
DROP INDEX IF EXISTS public.idx_user_plans_user_id;
DROP INDEX IF EXISTS public.idx_user_plans_plan;
DROP INDEX IF EXISTS public.idx_user_plans_period_start;
DROP INDEX IF EXISTS public.idx_user_plans_early_expires_at;
DROP INDEX IF EXISTS public.idx_user_profiles_email;
DROP INDEX IF EXISTS public.idx_user_profiles_created_at;
DROP INDEX IF EXISTS public.idx_subscriptions_stripe_customer_id;
DROP INDEX IF EXISTS public.idx_subscriptions_stripe_subscription_id;
DROP INDEX IF EXISTS public.idx_query_history_created_at;
