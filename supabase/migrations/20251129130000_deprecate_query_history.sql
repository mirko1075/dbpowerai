/*
  # Deprecate query_history table

  1. Purpose
    - Consolidate to single queries table
    - Migrate existing data from query_history to queries
    - Drop query_history table

  2. Migration Steps
    - Copy data from query_history to queries with origin='form'
    - Drop query_history table and related objects
    - Add table comment for documentation
*/

-- Migrate existing data from query_history to queries
INSERT INTO queries (
  user_id,
  raw_query,
  optimized_query,
  suggested_indexes,
  bottleneck,
  db_type,
  analysis,
  origin,
  created_at
)
SELECT
  user_id,
  input_query,
  (analysis_result->>'rewrittenQuery')::text,
  (analysis_result->>'suggestedIndex')::text,
  (
    SELECT string_agg(issue, ', ')
    FROM jsonb_array_elements_text(analysis_result->'issues') AS issue
  ),
  'unknown',
  analysis_result::text,
  'form', -- All existing query_history entries are from form
  created_at
FROM query_history
WHERE NOT EXISTS (
  -- Avoid duplicates if migration is run multiple times
  SELECT 1 FROM queries q
  WHERE q.user_id = query_history.user_id
  AND q.raw_query = query_history.input_query
  AND q.created_at = query_history.created_at
);

-- Drop query_history table
DROP TABLE IF EXISTS query_history CASCADE;

-- Add comment to queries table
COMMENT ON TABLE queries IS 'Unified table for all query analyses from form (origin=form) and webhook API (origin=webhook)';
COMMENT ON COLUMN queries.origin IS 'Source of the query: form (manual UI analysis), webhook (external API), or deleted_user (anonymized from deleted accounts)';
