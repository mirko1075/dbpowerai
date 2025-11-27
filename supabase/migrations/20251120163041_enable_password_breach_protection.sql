/*
  # Enable Password Breach Protection

  1. Security Enhancement
    - Enable Supabase Auth password breach protection
    - This checks passwords against HaveIBeenPwned.org database
    - Prevents users from using compromised passwords

  2. Implementation
    - Updates auth configuration to enable breach protection
    - This is a security best practice
*/

-- Enable password breach protection in Supabase Auth
-- Note: This requires Supabase Auth configuration which may be managed through Dashboard
-- This migration documents the security requirement

-- The actual setting is managed via Supabase Dashboard -> Authentication -> Policies
-- or via Management API, not directly through SQL migrations

-- Document the requirement for manual configuration if needed
DO $$
BEGIN
  RAISE NOTICE 'Password breach protection should be enabled in Supabase Dashboard';
  RAISE NOTICE 'Navigate to: Authentication -> Policies -> Enable "Check for breached passwords"';
END $$;
