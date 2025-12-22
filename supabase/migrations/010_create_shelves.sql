-- ============================================
-- CREATE SHELVES TABLE
-- Stores default and custom shelves per user
-- ============================================

-- Enum for shelf type
create type shelf_type as enum ('default', 'custom');

create table if not exists public.shelves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type shelf_type not null default 'custom',
  -- For default shelves, link to a reading_status; null for custom shelves
  status reading_status,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  unique (user_id, name)
);

comment on table public.shelves is 'Stores default and custom shelves per user';
comment on column public.shelves.type is 'Shelf type: default or custom';
comment on column public.shelves.status is 'Linked reading_status for default shelves (null for custom)';

create index if not exists shelves_user_id_idx on public.shelves(user_id);
create index if not exists shelves_user_type_idx on public.shelves(user_id, type);

-- Enable RLS
alter table public.shelves enable row level security;

-- RLS policies: users can only access their own shelves
create policy "Users can view their own shelves"
  on public.shelves for select
  using (auth.uid() = user_id);

create policy "Users can insert their own shelves"
  on public.shelves for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own shelves"
  on public.shelves for update
  using (auth.uid() = user_id);

create policy "Users can delete their own shelves"
  on public.shelves for delete
  using (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
create or replace function update_shelves_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger shelves_updated_at
  before update on public.shelves
  for each row execute function update_shelves_updated_at();

-- Seed default shelves for existing users
insert into public.shelves (user_id, name, type, status)
select
  p.id,
  s.name,
  'default'::shelf_type,
  s.status
from public.profiles p
cross join (
  values
    ('Currently Reading', 'currently_reading'::reading_status),
    ('Want to Read', 'want_to_read'::reading_status),
    ('Up Next', 'up_next'::reading_status),
    ('Did Not Finish', 'dnf'::reading_status),
    ('Finished', 'finished'::reading_status)
) as s(name, status)
where not exists (
  select 1
  from public.shelves sh
  where sh.user_id = p.id
    and sh.name = s.name
);


