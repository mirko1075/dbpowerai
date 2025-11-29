/*
  # API Key Rotation Audit Table

  1. Purpose
    - Track all API key rotations for security auditing
    - Record who rotated which key and when
    - Store SHA-256 hashed keys (not plaintext)
    - Provide tamper-proof audit trail via RLS

  2. Security
    - Only SECURITY DEFINER function can insert (ensures integrity)
    - Users can view their own audit records
    - Admins can view all audit records
    - No direct INSERT/UPDATE/DELETE allowed
*/

-- Enable pgcrypto extension for SHA-256 hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create audit table for API key rotations
CREATE TABLE IF NOT EXISTS public.api_key_rotation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rotated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  new_key text NOT NULL, -- SHA-256 hash of the new key (hex encoded)
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
'Audit trail for API key rotations. Records who rotated which key and when. Keys are stored as SHA-256 hashes for security.';

COMMENT ON COLUMN public.api_key_rotation_audit.user_id IS
'The user whose API key was rotated';

COMMENT ON COLUMN public.api_key_rotation_audit.rotated_by IS
'The user who performed the rotation (could be admin or the user themselves)';

COMMENT ON COLUMN public.api_key_rotation_audit.new_key IS
'SHA-256 hash of the new API key (hex encoded). NOT the plaintext key.';

COMMENT ON COLUMN public.api_key_rotation_audit.note IS
'Optional note about the rotation (e.g., "rotated via rotate_user_api_key")';

COMMENT ON COLUMN public.api_key_rotation_audit.ip IS
'Optional: IP address of the requester who initiated the rotation';

COMMENT ON COLUMN public.api_key_rotation_audit.user_agent IS
'Optional: User agent of the requester who initiated the rotation';
