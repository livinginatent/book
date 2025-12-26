-- ============================================
-- ADD last_read_at TO reading_sessions
-- Tracks when a book was last read based on reading sessions
-- ============================================

-- Add last_read_at column to reading_sessions
alter table public.reading_sessions 
  add column if not exists last_read_at timestamp with time zone;

-- Update existing records to use ended_at or started_at as last_read_at
update public.reading_sessions
set last_read_at = coalesce(ended_at, started_at)
where last_read_at is null;

-- Create index for efficient queries
create index if not exists reading_sessions_last_read_at_idx 
  on public.reading_sessions(last_read_at desc);

-- Add comment for documentation
comment on column public.reading_sessions.last_read_at is 'When the book was last read in this session';

