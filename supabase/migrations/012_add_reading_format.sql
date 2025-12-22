-- ============================================
-- ADD READING FORMAT TO USER_BOOKS
-- ============================================

-- 1) Create reading_format enum type
do $$
begin
  if not exists (
    select 1
    from pg_type t
    where t.typname = 'reading_format'
  ) then
    create type reading_format as enum ('physical', 'ebook', 'audiobook');
  end if;
end;
$$;

-- 2) Add reading_format column to user_books table
alter table public.user_books
  add column if not exists reading_format reading_format default 'physical';

-- 3) Add comment
comment on column public.user_books.reading_format is 'The format in which the user is reading this book (physical, ebook, or audiobook)';

