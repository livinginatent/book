-- ============================================
-- ADD review_attributes TO user_books
-- Stores additional review metadata as JSONB
-- ============================================

-- Add review_attributes column to user_books table
alter table public.user_books
  add column if not exists review_attributes jsonb default '{}'::jsonb;

-- Create GIN index for efficient JSONB queries
create index if not exists user_books_review_attributes_idx 
  on public.user_books using gin(review_attributes);

-- Add comment for documentation
comment on column public.user_books.review_attributes is 'Additional review metadata stored as JSONB (e.g., tags, notes, custom fields)';

