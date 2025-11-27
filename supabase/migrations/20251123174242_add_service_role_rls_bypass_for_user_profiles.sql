/*
  # Add Service Role RLS Bypass for user_profiles

  1. Changes
    - Add UPDATE policy for service_role to allow soft delete operations
    - This allows the delete-account Edge Function to update profiles using SERVICE_ROLE_KEY
  
  2. Security
    - Only service_role can use this policy
    - Regular authenticated users still restricted to own profiles
*/

-- Add policy to allow service_role to update any profile
-- This is needed for the delete-account Edge Function
CREATE POLICY "Service role can update any profile"
  ON user_profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);