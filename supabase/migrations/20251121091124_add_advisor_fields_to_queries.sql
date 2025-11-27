/*
  # Add SQL Advisor fields to queries table

  1. Changes
    - Add `analysis` (text, nullable) column to store detailed query analysis
    - Add `warnings` (text, nullable) column to store detected warnings as JSON array string

  2. Notes
    - This migration is idempotent and safe to run multiple times
    - All columns are nullable to maintain backward compatibility
    - The `warnings` field will store JSON array as text for compatibility
    - Existing data remains intact
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'queries' AND column_name = 'analysis'
  ) THEN
    ALTER TABLE queries ADD COLUMN analysis text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'queries' AND column_name = 'warnings'
  ) THEN
    ALTER TABLE queries ADD COLUMN warnings text;
  END IF;
END $$;
