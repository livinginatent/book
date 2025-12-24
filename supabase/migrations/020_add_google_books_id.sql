-- ============================================
-- ADD GOOGLE BOOKS ID SUPPORT
-- Migrate from Open Library to Google Books API
-- ============================================

-- Make open_library_id nullable (for backward compatibility)
alter table public.books alter column open_library_id drop not null;

-- Add google_books_id column
alter table public.books add column if not exists google_books_id text unique;

-- Create index for google_books_id
create index if not exists books_google_books_id_idx on public.books(google_books_id);

-- Update unique constraint to allow nulls in open_library_id
-- (PostgreSQL allows multiple nulls in unique columns)
drop index if exists books_open_library_id_idx;
create unique index books_open_library_id_idx on public.books(open_library_id) where open_library_id is not null;

-- Add constraint: at least one ID must be present (if constraint doesn't exist)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'books_must_have_id'
  ) then
    alter table public.books add constraint books_must_have_id 
      check (open_library_id is not null or google_books_id is not null);
  end if;
end $$;

