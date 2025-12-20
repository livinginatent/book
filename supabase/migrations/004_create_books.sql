-- ============================================
-- BOOKS TABLE
-- Stores book metadata fetched from Open Library
-- ============================================

-- Create the books table
create table if not exists public.books (
  id uuid default gen_random_uuid() primary key,
  
  -- Open Library identifiers
  open_library_id text unique not null,  -- e.g., "OL1234W" (work ID)
  open_library_edition_id text,           -- e.g., "OL1234M" (edition ID)
  
  -- Core book metadata
  title text not null,
  subtitle text,
  authors text[] default '{}',            -- Array of author names
  
  -- Description & content
  description text,
  subjects text[] default '{}',           -- Categories/genres
  
  -- Publication info
  publish_date text,
  publishers text[] default '{}',
  
  -- Book identifiers
  isbn_10 text[],
  isbn_13 text[],
  
  -- Physical attributes
  page_count integer,
  
  -- Cover images
  cover_url_small text,
  cover_url_medium text,
  cover_url_large text,
  
  -- Language
  language text,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- When we last synced from Open Library
  last_synced_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for common queries
create index if not exists books_open_library_id_idx on public.books(open_library_id);
create index if not exists books_title_idx on public.books using gin(to_tsvector('english', title));
create index if not exists books_authors_idx on public.books using gin(authors);
create index if not exists books_isbn_10_idx on public.books using gin(isbn_10);
create index if not exists books_isbn_13_idx on public.books using gin(isbn_13);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Books are publicly readable
-- ============================================

-- Enable RLS
alter table public.books enable row level security;

-- Policy: Anyone can read books (public catalog)
create policy "Books are publicly readable"
  on public.books for select
  using (true);

-- Policy: Service role can insert books (from lazy fetch)
create policy "Service role can insert books"
  on public.books for insert
  with check (auth.role() = 'service_role'); -- Changed 'using' to 'with check'

-- Policy: Service role can update books (for re-syncing)
create policy "Service role can update books"
  on public.books for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================
-- AUTO-UPDATE updated_at TIMESTAMP
-- ============================================

-- Trigger that fires before any update to books
drop trigger if exists on_books_updated on public.books;
create trigger on_books_updated
  before update on public.books
  for each row execute procedure public.handle_updated_at();

