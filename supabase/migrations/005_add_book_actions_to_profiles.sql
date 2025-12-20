-- ============================================
-- ADD BOOK ACTION FIELDS TO PROFILES
-- Tracks books in different reading states
-- ============================================

-- Add book action arrays to profiles table
-- Each field stores an array of book IDs (UUIDs)
alter table public.profiles
  add column if not exists want_to_read uuid[] default '{}',
  add column if not exists currently_reading uuid[] default '{}',
  add column if not exists up_next uuid[] default '{}',
  add column if not exists did_not_finish uuid[] default '{}';

-- Add comments for documentation
comment on column public.profiles.want_to_read is 'Array of book IDs the user wants to read';
comment on column public.profiles.currently_reading is 'Array of book IDs the user is currently reading';
comment on column public.profiles.up_next is 'Array of book IDs the user plans to read next';
comment on column public.profiles.did_not_finish is 'Array of book IDs the user did not finish reading';

-- Create GIN indexes for efficient array queries
-- GIN indexes allow fast lookups like "does this array contain this book ID?"
create index if not exists profiles_want_to_read_idx on public.profiles using gin(want_to_read);
create index if not exists profiles_currently_reading_idx on public.profiles using gin(currently_reading);
create index if not exists profiles_up_next_idx on public.profiles using gin(up_next);
create index if not exists profiles_did_not_finish_idx on public.profiles using gin(did_not_finish);

