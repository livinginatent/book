-- ============================================
-- CREATE READING JOURNAL TABLE
-- Stores user's notes, quotes, and predictions for books
-- ============================================

create type journal_entry_type as enum ('note', 'quote', 'prediction');

create table if not exists public.reading_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  type journal_entry_type not null,
  content text not null,
  page integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add comments for documentation
comment on table public.reading_journal is 'Stores user journal entries (notes, quotes, predictions) for books';
comment on column public.reading_journal.type is 'Type of journal entry: note, quote, or prediction';
comment on column public.reading_journal.content is 'The content of the journal entry';
comment on column public.reading_journal.page is 'Optional page number where the entry was made';

-- Create indexes for efficient queries
create index if not exists reading_journal_user_id_idx on public.reading_journal(user_id);
create index if not exists reading_journal_book_id_idx on public.reading_journal(book_id);
create index if not exists reading_journal_user_book_idx on public.reading_journal(user_id, book_id);
create index if not exists reading_journal_created_at_idx on public.reading_journal(created_at desc);

-- Enable RLS
alter table public.reading_journal enable row level security;

-- RLS policies: users can only access their own journal entries
create policy "Users can view their own journal entries"
  on public.reading_journal for select
  using (auth.uid() = user_id);

create policy "Users can insert their own journal entries"
  on public.reading_journal for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own journal entries"
  on public.reading_journal for update
  using (auth.uid() = user_id);

create policy "Users can delete their own journal entries"
  on public.reading_journal for delete
  using (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
create or replace function update_reading_journal_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger reading_journal_updated_at
  before update on public.reading_journal
  for each row execute function update_reading_journal_updated_at();


