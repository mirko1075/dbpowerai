/*
  # Add detected_patterns column to queries table

  1. Changes
    - Add `detected_patterns` (text, nullable) column to store detected patterns as JSON array string
    - This will store the pattern detection results from the SQL analysis

  2. Notes
    - This migration is idempotent and safe to run multiple times
    - Column is nullable to maintain backward compatibility
    - The `detected_patterns` field will store JSON array as text for compatibility
    - Existing data remains intact
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'queries' AND column_name = 'detected_patterns'
  ) THEN
    ALTER TABLE queries ADD COLUMN detected_patterns text;
  END IF;
END $$;
