/*
  # Add Schema and Execution Plan to Queries Table

  1. Changes
    - Add `schema` column (text, nullable) - to store table schemas for context
    - Add `execution_plan` column (text, nullable) - to store EXPLAIN output
    
  2. Purpose
    - Allow users to provide additional context when analyzing queries
    - Enable better AI-powered optimization by including schema information
    - Store execution plans for detailed performance analysis
    - Support future analysis and comparison features

  3. Notes
    - These fields are optional and can be null
    - Will be included when users submit queries through the app
    - Both public (Landing) and authenticated (AppPage) flows will support these
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'queries' AND column_name = 'schema'
  ) THEN
    ALTER TABLE queries ADD COLUMN schema text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'queries' AND column_name = 'execution_plan'
  ) THEN
    ALTER TABLE queries ADD COLUMN execution_plan text;
  END IF;
END $$;