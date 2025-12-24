-- ============================================
-- READING GOALS
-- Generalized goal system for the goal wizard
-- ============================================

-- Enum for goal type
create type goal_type as enum ('books', 'pages', 'diversity', 'consistency');

create table if not exists public.reading_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- Core goal type selected in the wizard
  type goal_type not null,

  -- Whether this goal is currently active for the user
  is_active boolean not null default true,

  -- Flexible configuration payload, interpreted by the app depending on type
  -- Examples:
  --  - books:        { "target": 12, "current": 0, "year": 2025, "is_public": true }
  --  - pages:        { "target": 5000, "current": 0, "year": 2025, "is_public": true }
  --  - diversity:    { "target": 5, "current": 0, "year": 2025, "is_public": true, "genres": ["Non-fiction", "Fiction"] }
  --  - consistency:  { "target": 30, "current": 0, "year": 2025, "is_public": true }
  config jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table public.reading_goals is 'Stores user reading goals (books, pages, diversity, consistency) selected via the goal wizard';
comment on column public.reading_goals.type is 'Goal type: books, pages, diversity, or consistency';
comment on column public.reading_goals.config is 'Goal configuration payload (JSON) interpreted per goal type';

-- Indexes for common access patterns
create index if not exists reading_goals_user_id_idx on public.reading_goals(user_id);
create index if not exists reading_goals_user_active_idx on public.reading_goals(user_id, is_active);

-- Enable RLS
alter table public.reading_goals enable row level security;

-- RLS policies: users can only access their own goals
create policy "Users can view their own goals"
  on public.reading_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own goals"
  on public.reading_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own goals"
  on public.reading_goals for update
  using (auth.uid() = user_id);

create policy "Users can delete their own goals"
  on public.reading_goals for delete
  using (auth.uid() = user_id);

-- Trigger to keep updated_at fresh
create or replace function update_reading_goals_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger reading_goals_updated_at
  before update on public.reading_goals
  for each row execute function update_reading_goals_updated_at();


