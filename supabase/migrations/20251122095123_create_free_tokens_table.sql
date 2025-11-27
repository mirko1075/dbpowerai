/*
  # Create Free Tokens Table for Anonymous Analysis

  1. Purpose
    - Track single-use free analysis tokens for anonymous users
    - Prevent abuse by storing which tokens have been used
    - Enable server-side enforcement of "1 free analysis" limit
    
  2. New Tables
    - `free_tokens`
      - `token` (text, primary key) - Unique token identifier
      - `used_at` (timestamptz) - Timestamp when token was first used
      - `ip_address` (text, nullable) - Optional IP tracking for analytics
      
  3. Security
    - No RLS needed - accessed only by Edge Functions
    - Server-side only table
    - Tokens cannot be reused once registered
    
  4. Flow
    - First-time anonymous user generates token client-side
    - Edge Function checks if token exists in this table
    - If NOT exists: allow analysis + insert token
    - If exists: token already used → block request
*/

CREATE TABLE IF NOT EXISTS free_tokens (
  token TEXT PRIMARY KEY,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_free_tokens_used_at ON free_tokens(used_at);

-- No RLS - this table is accessed only by Edge Functions with service role key