/*
  # Fix Foreign Keys to Enable Soft Delete

  1. Problem
    - Foreign keys have ON DELETE CASCADE
    - This causes hard deletion before trigger can run soft delete
    - Trigger receives empty result set

  2. Solution
    - Drop existing foreign key constraints
    - Recreate them with ON DELETE NO ACTION
    - This allows trigger to run first and perform soft delete

  3. Tables Affected
    - user_profiles (id -> auth.users.id)
    - user_plans (user_id -> auth.users.id)
    - queries (user_id -> auth.users.id)
    - query_history (user_id -> auth.users.id)
*/

-- Drop and recreate user_profiles foreign key
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE NO ACTION;

-- Drop and recreate user_plans foreign key
ALTER TABLE public.user_plans
DROP CONSTRAINT IF EXISTS user_plans_user_id_fkey;

ALTER TABLE public.user_plans
ADD CONSTRAINT user_plans_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE NO ACTION;

-- Drop and recreate queries foreign key
ALTER TABLE public.queries
DROP CONSTRAINT IF EXISTS queries_user_id_fkey;

ALTER TABLE public.queries
ADD CONSTRAINT queries_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE NO ACTION;

-- Drop and recreate query_history foreign key
ALTER TABLE public.query_history
DROP CONSTRAINT IF EXISTS query_history_user_id_fkey;

ALTER TABLE public.query_history
ADD CONSTRAINT query_history_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE NO ACTION;
