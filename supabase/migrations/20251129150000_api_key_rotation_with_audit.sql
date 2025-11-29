/*
  # API Key Rotation with Audit Trail

  1. Purpose
    - Enable secure API key rotation via SECURITY DEFINER function
    - Track all rotations in audit table with SHA-256 hashed keys
    - Provide tamper-proof audit trail via RLS

  2. Security
    - Uses pgcrypto for SHA-256 hashing of keys in audit
    - Only SECURITY DEFINER function can insert audit records
    - Users can view their own audit records
    - Admins can view all audit records
    - No direct INSERT/UPDATE/DELETE allowed on audit table

  3. Components
    - pgcrypto extension for cryptographic functions
    - api_key_rotation_audit table for audit trail
    - rotate_user_api_key() SECURITY DEFINER function
*/

-- Enable pgcrypto extension for SHA-256 hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create audit table for API key rotations
CREATE TABLE IF NOT EXISTS public.api_key_rotation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rotated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  new_key text NOT NULL, -- SHA-256 hash of the new key
  note text,
  ip text, -- Optional: IP address of the requester
  user_agent text, -- Optional: User agent of the requester
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_api_key_rotation_audit_user_id
ON public.api_key_rotation_audit(user_id);

CREATE INDEX IF NOT EXISTS idx_api_key_rotation_audit_rotated_at
ON public.api_key_rotation_audit(rotated_at DESC);

-- Enable RLS
ALTER TABLE public.api_key_rotation_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own audit records
CREATE POLICY "Users can view own API key rotation history"
ON public.api_key_rotation_audit
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all audit records
CREATE POLICY "Admins can view all API key rotation history"
ON public.api_key_rotation_audit
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Add table and column comments
COMMENT ON TABLE public.api_key_rotation_audit IS
'Audit trail for API key rotations. Records who rotated which key and when. Keys are stored as SHA-256 hashes.';

COMMENT ON COLUMN public.api_key_rotation_audit.user_id IS
'The user whose API key was rotated';

COMMENT ON COLUMN public.api_key_rotation_audit.rotated_by IS
'The user who performed the rotation (could be admin or the user themselves)';

COMMENT ON COLUMN public.api_key_rotation_audit.new_key IS
'SHA-256 hash of the new API key (hex encoded)';

COMMENT ON COLUMN public.api_key_rotation_audit.note IS
'Optional note about the rotation (e.g., "rotated via rotate_user_api_key")';

COMMENT ON COLUMN public.api_key_rotation_audit.ip IS
'Optional: IP address of the requester';

COMMENT ON COLUMN public.api_key_rotation_audit.user_agent IS
'Optional: User agent of the requester';

-- Create SECURITY DEFINER function for API key rotation
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
'Securely rotate a user API key. Checks permissions (self or admin), generates new UUID key, updates user_profiles, logs to audit with SHA-256 hash, and returns plaintext key.';
