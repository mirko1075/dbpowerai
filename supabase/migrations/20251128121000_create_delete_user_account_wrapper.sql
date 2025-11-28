-- Compatibility wrapper: provide old RPC name delete_user_account
-- Created: 2025-11-28

BEGIN;

-- Wrapper that forwards to request_user_deletion. This makes RPC calls using the old name work.
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid, p_requested_by uuid)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT public.request_user_deletion(p_user_id := $1, p_requested_by := $2);
$$;

-- Also add a JSON-parameter variant used by some clients (single json param)
CREATE OR REPLACE FUNCTION public.delete_user_account(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  uid uuid;
  requested_by uuid;
BEGIN
  uid := (payload ->> 'user_id')::uuid;
  requested_by := (payload ->> 'requested_by')::uuid;
  RETURN public.request_user_deletion(uid, requested_by);
END;
$$;

COMMIT;
