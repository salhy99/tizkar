-- Migration: Add Username to Profiles

ALTER TABLE public.profiles ADD COLUMN username TEXT;

CREATE UNIQUE INDEX idx_profiles_username_lower ON public.profiles(lower(username));
