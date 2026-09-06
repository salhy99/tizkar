-- Migration: Name-Based Authentication Schema (Canonical Name & Exact Lookup)

-- 1. Drop obsolete username elements if present
DROP INDEX IF EXISTS public.idx_profiles_username_lower;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS username;

-- 2. Add canonical login_name_normalized column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_name_normalized TEXT;

-- 3. Populate existing rows with normalized display_name
UPDATE public.profiles 
SET login_name_normalized = lower(trim(regexp_replace(display_name, '\s+', ' ', 'g')))
WHERE login_name_normalized IS NULL AND display_name IS NOT NULL;

-- 4. Create unique index on login_name_normalized
DROP INDEX IF EXISTS public.idx_profiles_display_name_lower;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_login_name_normalized 
ON public.profiles (login_name_normalized);

NOTIFY pgrst, 'reload schema';
