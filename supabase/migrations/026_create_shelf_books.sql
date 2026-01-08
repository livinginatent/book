-- ============================================
-- CREATE SHELF_BOOKS TABLE
-- Junction table linking user_books to custom shelves
-- ============================================

create table if not exists public.shelf_books (
  id uuid not null default gen_random_uuid(),
  shelf_id uuid not null,
  user_book_id uuid not null,
  sort_order integer not null default 0,
  created_at timestamp with time zone null default now(),
  
  constraint shelf_books_pkey primary key (id),
  constraint shelf_books_shelf_id_user_book_id_key unique (shelf_id, user_book_id),
  constraint shelf_books_shelf_id_fkey foreign key (shelf_id) 
    references public.shelves (id) on delete cascade,
  constraint shelf_books_user_book_id_fkey foreign key (user_book_id) 
    references public.user_books (id) on delete cascade
);

comment on table public.shelf_books is 'Junction table linking user_books to custom shelves';

-- Create indexes for better query performance
create index if not exists shelf_books_shelf_id_idx 
  on public.shelf_books using btree (shelf_id);
  
create index if not exists shelf_books_user_book_id_idx 
  on public.shelf_books using btree (user_book_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only manage their own shelf_books
-- ============================================

-- Enable RLS
alter table public.shelf_books enable row level security;

-- Policy: Users can view shelf_books for their own shelves
create policy "Users can view their own shelf_books"
  on public.shelf_books for select
  using (
    exists (
      select 1 from public.shelves
      where shelves.id = shelf_books.shelf_id
        and shelves.user_id = auth.uid()
    )
  );

-- Policy: Users can insert shelf_books for their own shelves
create policy "Users can insert their own shelf_books"
  on public.shelf_books for insert
  with check (
    exists (
      select 1 from public.shelves
      where shelves.id = shelf_books.shelf_id
        and shelves.user_id = auth.uid()
    )
    and
    exists (
      select 1 from public.user_books
      where user_books.id = shelf_books.user_book_id
        and user_books.user_id = auth.uid()
    )
  );

-- Policy: Users can update shelf_books for their own shelves
create policy "Users can update their own shelf_books"
  on public.shelf_books for update
  using (
    exists (
      select 1 from public.shelves
      where shelves.id = shelf_books.shelf_id
        and shelves.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.shelves
      where shelves.id = shelf_books.shelf_id
        and shelves.user_id = auth.uid()
    )
  );

-- Policy: Users can delete shelf_books for their own shelves
create policy "Users can delete their own shelf_books"
  on public.shelf_books for delete
  using (
    exists (
      select 1 from public.shelves
      where shelves.id = shelf_books.shelf_id
        and shelves.user_id = auth.uid()
    )
  );

