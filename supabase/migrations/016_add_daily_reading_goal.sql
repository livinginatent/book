-- ============================================
-- ADD DAILY READING GOAL TO PROFILES
-- ============================================

-- Add daily_goal column to profiles table
alter table public.profiles
  add column if not exists daily_reading_goal integer default 40;

-- Add comment
comment on column public.profiles.daily_reading_goal is 'User daily reading goal in pages (default: 40)';

