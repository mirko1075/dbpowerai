-- Add origin column and index to query_history if missing
ALTER TABLE IF EXISTS public.query_history
  ADD COLUMN IF NOT EXISTS origin text;

-- Create index on origin if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'query_history' AND indexname = 'query_history_origin_idx'
  ) THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS query_history_origin_idx ON public.query_history(origin)';
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- If table doesn't exist yet, ignore; migration is idempotent and will be retried later
  RAISE NOTICE 'query_history table does not exist yet, skipping index creation for now';
END$$;
