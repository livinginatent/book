-- ============================================
-- GOAL STATUS TRACKING
-- Add proper status tracking for reading goals
-- ============================================

-- Create goal status enum
create type goal_status as enum ('active', 'completed', 'archived');

-- Add status column to reading_goals table
alter table public.reading_goals
  add column if not exists status goal_status not null default 'active';

-- Add completed_at timestamp for tracking when goals were achieved
alter table public.reading_goals
  add column if not exists completed_at timestamp with time zone;

-- Migrate existing data:
-- - Goals with is_active = true become 'active'
-- - Goals with is_active = false become 'archived'
-- - Note: We'll mark goals as 'completed' programmatically when they're achieved
update public.reading_goals
set status = case
  when is_active = true then 'active'::goal_status
  else 'archived'::goal_status
end;

-- Add index for querying by status
create index if not exists reading_goals_user_status_idx 
  on public.reading_goals(user_id, status);

-- Add index for completed goals with date
create index if not exists reading_goals_completed_idx 
  on public.reading_goals(user_id, status, completed_at) 
  where status = 'completed';

-- Add comment explaining the status field
comment on column public.reading_goals.status is 
  'Goal status: active (currently tracking), completed (achieved target), archived (manually deactivated)';

comment on column public.reading_goals.completed_at is 
  'Timestamp when the goal was marked as completed (when current >= target)';

-- Function to mark a goal as completed
create or replace function mark_goal_completed(goal_id uuid)
returns void as $$
begin
  update public.reading_goals
  set 
    status = 'completed'::goal_status,
    is_active = false,
    completed_at = now()
  where id = goal_id
    and status = 'active';
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
grant execute on function mark_goal_completed(uuid) to authenticated;

-- Add comment
comment on function mark_goal_completed(uuid) is 
  'Marks a goal as completed when the target is achieved. Sets status to completed, is_active to false, and records completion timestamp.';

