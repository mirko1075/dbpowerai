/*
  # API Key Rotation Function

  1. Purpose
    - Securely rotate user API keys via SECURITY DEFINER
    - Enforce permission checks (self or admin)
    - Generate new UUID as API key
    - Hash and audit the rotation
    - Return plaintext key to caller (only time it's shown)

  2. Security
    - SECURITY DEFINER bypasses RLS for updates
    - Checks auth.uid() to prevent impersonation
    - Verifies requester = target OR is_admin()
    - Hashes key with SHA-256 before storing in audit

  3. Usage
    - Called via RPC from Edge Function
    - SELECT rotate_user_api_key(auth.uid(), auth.uid())
    - Returns text (plaintext new API key)
*/

CREATE OR REPLACE FUNCTION public.rotate_user_api_key(
  p_requester uuid,
  p_target uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester uuid := p_requester;
  v_target uuid := p_target;
  v_caller uuid := (SELECT auth.uid());
  v_new_key text := gen_random_uuid()::text;
  v_new_key_hash text;
  v_now timestamptz := now();
BEGIN
  -- Verify caller has auth context
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no auth context' USING ERRCODE = 'P0001';
  END IF;

  -- Verify caller matches requester (prevents impersonation)
  IF v_caller <> v_requester THEN
    RAISE EXCEPTION 'Requester mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- Verify caller is authorized (self-rotation or admin)
  IF NOT (v_caller = v_target OR is_admin(v_caller)) THEN
    RAISE EXCEPTION 'Unauthorized update' USING ERRCODE = 'P0001';
  END IF;

  -- Update user profile with new API key
  UPDATE public.user_profiles
  SET api_key = v_new_key
  WHERE id = v_target;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found' USING ERRCODE = 'P0001';
  END IF;

  -- Compute SHA-256 hash of the new key
  v_new_key_hash := encode(digest(v_new_key, 'sha256'), 'hex');

  -- Insert audit record with hashed key
  -- Note: IP and user_agent are NULL for now (can be added later if needed)
  INSERT INTO public.api_key_rotation_audit(
    user_id,
    rotated_by,
    rotated_at,
    new_key,
    note,
    ip,
    user_agent
  )
  VALUES (
    v_target,
    v_caller,
    v_now,
    v_new_key_hash,
    'rotated via rotate_user_api_key',
    NULL, -- IP address (not available in function context)
    NULL  -- User agent (not available in function context)
  );

  -- Return the plaintext new key to the caller
  -- This is the ONLY time the key is returned in plaintext
  RETURN v_new_key;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION public.rotate_user_api_key(uuid, uuid) IS
'Securely rotate a user API key. Checks permissions (self or admin), generates new UUID key, updates user_profiles, logs to audit with SHA-256 hash, and returns plaintext key. This is a SECURITY DEFINER function that bypasses RLS.';
