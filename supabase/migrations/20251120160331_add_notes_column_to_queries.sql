/*
  # Add notes column to queries table

  1. Changes
    - Add `notes` (text, nullable) column to `queries` table for storing optimization notes and explanations

  2. Notes
    - This migration is idempotent and safe to run multiple times
    - The column is nullable to maintain backward compatibility
*/

-- Add notes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'queries' AND column_name = 'notes'
  ) THEN
    ALTER TABLE queries ADD COLUMN notes text;
  END IF;
END $$;
