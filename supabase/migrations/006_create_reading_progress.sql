-- ============================================
-- CREATE READING PROGRESS TABLE
-- Tracks user's reading progress for each book
-- ============================================

create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  pages_read integer not null default 0,
  started_at timestamp with time zone default now(),
  last_read_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Ensure one progress record per user per book
  unique(user_id, book_id)
);

-- Add comments for documentation
comment on table public.reading_progress is 'Tracks reading progress for each user-book pair';
comment on column public.reading_progress.pages_read is 'Number of pages the user has read';
comment on column public.reading_progress.started_at is 'When the user started reading this book';
comment on column public.reading_progress.last_read_at is 'When the user last updated their progress';

-- Create indexes for efficient queries
create index if not exists reading_progress_user_id_idx on public.reading_progress(user_id);
create index if not exists reading_progress_book_id_idx on public.reading_progress(book_id);
create index if not exists reading_progress_user_book_idx on public.reading_progress(user_id, book_id);

-- Enable RLS
alter table public.reading_progress enable row level security;

-- RLS policies: users can only access their own reading progress
create policy "Users can view their own reading progress"
  on public.reading_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reading progress"
  on public.reading_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reading progress"
  on public.reading_progress for update
  using (auth.uid() = user_id);

create policy "Users can delete their own reading progress"
  on public.reading_progress for delete
  using (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
create or replace function update_reading_progress_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.last_read_at = now();
  return new;
end;
$$ language plpgsql;

create trigger reading_progress_updated_at
  before update on public.reading_progress
  for each row execute function update_reading_progress_updated_at();

