-- ============================================
-- CREATE READING SESSIONS TABLE
-- Tracks individual reading sessions for analytics
-- ============================================

create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  pages_read integer not null default 0,
  duration_minutes integer,
  session_date date not null default current_date,
  started_at timestamp with time zone default now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add comments for documentation
comment on table public.reading_sessions is 'Tracks individual reading sessions for analytics';
comment on column public.reading_sessions.pages_read is 'Number of pages read in this session';
comment on column public.reading_sessions.duration_minutes is 'Duration of the reading session in minutes';
comment on column public.reading_sessions.session_date is 'Date of the reading session';

-- Create indexes for efficient queries
create index if not exists reading_sessions_user_id_idx on public.reading_sessions(user_id);
create index if not exists reading_sessions_book_id_idx on public.reading_sessions(book_id);
create index if not exists reading_sessions_user_book_idx on public.reading_sessions(user_id, book_id);
create index if not exists reading_sessions_session_date_idx on public.reading_sessions(session_date desc);
create index if not exists reading_sessions_user_date_idx on public.reading_sessions(user_id, session_date desc);

-- Enable RLS
alter table public.reading_sessions enable row level security;

-- RLS policies: users can only access their own reading sessions
create policy "Users can view their own reading sessions"
  on public.reading_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reading sessions"
  on public.reading_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reading sessions"
  on public.reading_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own reading sessions"
  on public.reading_sessions for delete
  using (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
create or replace function update_reading_sessions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger reading_sessions_updated_at
  before update on public.reading_sessions
  for each row execute function update_reading_sessions_updated_at();


