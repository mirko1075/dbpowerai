-- Create table to persist function debug logs for edge functions
-- This helps capture diagnostics even when console logs are not visible in the dashboard
CREATE TABLE IF NOT EXISTS public.function_debug_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name text NOT NULL,
  event_time timestamptz DEFAULT now() NOT NULL,
  level text NOT NULL,
  message text,
  meta jsonb
);

CREATE INDEX IF NOT EXISTS idx_function_debug_logs_function_time ON public.function_debug_logs(function_name, event_time DESC);

COMMENT ON TABLE public.function_debug_logs IS 'Persistent debug logs written by Edge Functions for troubleshooting';
