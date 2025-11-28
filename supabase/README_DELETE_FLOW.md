This file explains the user deletion flow implemented in this repo.

Overview
- Soft-delete flow: Edge Function `delete-account` validates the caller, then calls the DB RPC `public.request_user_deletion(user_id, requested_by)` using the service role key. That RPC soft-deletes `user_profiles` and enqueues a row into `public.deletion_queue` scheduled for `NOW() + retention` (default 30 days).
- Hard-delete flow: A scheduled worker (pg_cron or an Edge Function run with service role) should pick up `deletion_queue` rows where `scheduled_for <= NOW()` and call `public.perform_hard_delete(user_id, performed_by)`.

Files added
- `supabase/migrations/20251128120000_add_deletion_queue_and_rpcs.sql` - creates `deletion_queue`, `audit_deletions`, `request_user_deletion()` and `perform_hard_delete()`.
- `supabase/functions/delete-account/index.ts` - Edge Function that validates the caller and calls the RPC.

How to run the migration
1. Use the Supabase CLI or your preferred migration runner to apply the SQL in `supabase/migrations/...` to your database.

Environment variables for Edge Function
- SUPABASE_URL - your Supabase project URL
- SUPABASE_ANON_KEY - anon key (used to validate caller JWT forwarded in Authorization header)
- SUPABASE_SERVICE_ROLE_KEY - service_role key (used to call RPCs that require elevated privileges)
- DBPOWER_ADMIN_KEY - optional admin bearer token to allow privileged operations (like immediate hard delete). Keep this secret.

Notes and next steps
- The `perform_hard_delete` function is SECURITY DEFINER; revoke EXECUTE from PUBLIC and grant only to a restricted admin/service role.
- Implement a scheduled worker (pg_cron or an Edge Function invoked by an external scheduler) to process the `deletion_queue` and call `perform_hard_delete` for eligible rows.
- Consider adding anonymization steps and Storage deletion logic in `perform_hard_delete` for your project's specific tables and storage layout.
- Test end-to-end on a staging project before enabling in production.
