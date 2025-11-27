/*
  # Add Soft Delete Support to User Tables

  1. Changes to user_profiles
    - Add `is_deleted` boolean column (default false)
    - Add `deleted_at` timestamptz column

  2. Changes to user_plans
    - Add `is_deleted` boolean column (default false)
    - Add `deleted_at` timestamptz column

  3. Notes
    - Existing data remains unchanged
    - No constraints or indexes are dropped
    - Columns are nullable for deleted_at (only set when deleted)
*/

-- Add soft delete fields to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add soft delete fields to user_plans
ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
