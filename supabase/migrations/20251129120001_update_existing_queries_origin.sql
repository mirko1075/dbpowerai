/*
  # Update existing queries to origin='form'

  1. Purpose
    - Set all existing queries to origin='form' since they came from manual form
    - Ensures data consistency for queries created before origin column was added
    - Default value of 'form' is already set, but this makes it explicit

  2. Changes
    - Update all queries with NULL or default origin to 'form'
    - This is idempotent and safe to run multiple times
*/

-- Update all existing queries to have origin='form'
-- This catches any queries that might have been created before the column was added
UPDATE queries
SET origin = 'form'
WHERE origin IS NULL OR origin = '';

-- Add comment for documentation
COMMENT ON TABLE queries IS 'Stores all SQL query analyses from both manual form (origin=form) and webhook API (origin=webhook)';
