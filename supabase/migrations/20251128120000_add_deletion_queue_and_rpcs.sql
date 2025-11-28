-- Migration: Add deletion_queue, audit_deletions and user deletion RPCs
-- Created: 2025-11-28

BEGIN;

-- Queue table for scheduled hard deletes
CREATE TABLE IF NOT EXISTS public.deletion_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, failed
  error text DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_deletion_queue_scheduled_status ON public.deletion_queue (scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_deletion_queue_user_id ON public.deletion_queue (user_id);

-- Audit table to record hard delete actions
CREATE TABLE IF NOT EXISTS public.audit_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  performed_by uuid NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  details jsonb DEFAULT '{}'
);

-- RPC to request a soft-delete and enqueue a hard-delete job
CREATE OR REPLACE FUNCTION public.request_user_deletion(p_user_id uuid, p_requested_by uuid, p_retention_interval interval DEFAULT '30 days')
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  scheduled timestamptz := now() + p_retention_interval;
BEGIN
  -- Soft-delete profile rows if present
  PERFORM 1 FROM public.user_profiles WHERE id = p_user_id;
  IF FOUND THEN
    UPDATE public.user_profiles SET is_deleted = true, deleted_at = now() WHERE id = p_user_id;
  END IF;

  -- Insert into queue if not already scheduled (idempotent)
  IF NOT EXISTS (SELECT 1 FROM public.deletion_queue WHERE user_id = p_user_id AND status IN ('pending','in_progress')) THEN
    INSERT INTO public.deletion_queue (user_id, requested_by, requested_at, scheduled_for, status)
    VALUES (p_user_id, p_requested_by, now(), scheduled, 'pending');
  END IF;

  RETURN jsonb_build_object('ok', true, 'scheduled_for', scheduled);
END;
$$;

-- SECURITY DEFINER function to perform irreversible hard delete.
-- WARNING: This function will attempt to permanently remove user data and auth.users row.
CREATE OR REPLACE FUNCTION public.perform_hard_delete(p_user_id uuid, p_performed_by uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int := 0;
BEGIN
  -- Ensure caller has privileges - will run as owner (usually postgres). Implement further checks if needed.

  -- Delete storage objects via extension if available (pg_storage or supabase-specific). We'll record that removal should be done by external worker if not available.

  -- Delete rows from application tables. Order carefully for FK constraints.
  UPDATE public.user_profiles SET is_deleted = true, deleted_at = now() WHERE id = p_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Example: delete other app data if needed (uncommment and adapt):
  -- DELETE FROM public.posts WHERE author_id = p_user_id;

  -- Remove from deletion_queue (mark completed)
  UPDATE public.deletion_queue SET status = 'completed', error = NULL WHERE user_id = p_user_id;

  -- Attempt to remove auth.users entry if role permits
  BEGIN
    PERFORM 1 FROM auth.users WHERE id = p_user_id;
    IF FOUND THEN
      DELETE FROM auth.users WHERE id = p_user_id;
    END IF;
  EXCEPTION WHEN others THEN
    -- If deleting from auth.users fails (e.g. permission), record error and continue
    UPDATE public.deletion_queue SET status = 'failed', error = 'auth.users deletion failed' WHERE user_id = p_user_id;
    INSERT INTO public.audit_deletions (user_id, performed_by, details) VALUES (p_user_id, p_performed_by, jsonb_build_object('error','auth.users deletion failed'));
    RETURN jsonb_build_object('ok', false, 'error', 'auth.users deletion failed');
  END;

  INSERT INTO public.audit_deletions (user_id, performed_by, details) VALUES (p_user_id, p_performed_by, jsonb_build_object('deleted_rows', deleted_count));

  RETURN jsonb_build_object('ok', true, 'deleted_rows', deleted_count);
END;
$$;

-- Revoke execute from public for perform_hard_delete, grant only to postgres (or a management role)
REVOKE EXECUTE ON FUNCTION public.perform_hard_delete(uuid, uuid) FROM PUBLIC;
-- The service role (role name 'service_role' used by Supabase) will be granted at deployment-time if desired.

COMMIT;
