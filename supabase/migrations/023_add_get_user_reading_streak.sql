-- ============================================
-- GET USER READING STREAK FUNCTION
-- Calculates consecutive reading days ending today
-- ============================================

create or replace function public.get_user_reading_streak(
  target_user_id uuid,
  user_timezone text default 'UTC'
)
returns integer
language plpgsql
security definer
as $$
declare
  streak_count integer := 0;
  check_date date;
  today_in_tz date;
  has_reading boolean;
begin
  -- Get today's date in the user's timezone
  today_in_tz := (now() at time zone user_timezone)::date;
  check_date := today_in_tz;
  
  -- Loop backwards from today checking each day for reading activity
  loop
    -- Check if there's any reading session on this date with pages_read > 0
    select exists(
      select 1
      from public.reading_sessions
      where user_id = target_user_id
        and session_date = check_date
        and pages_read > 0
    ) into has_reading;
    
    -- If no reading on this day, break the streak
    if not has_reading then
      -- Special case: if checking today and no reading yet, check if yesterday had reading
      -- This allows the streak to continue if the user hasn't read yet today
      if check_date = today_in_tz and streak_count = 0 then
        check_date := check_date - interval '1 day';
        
        select exists(
          select 1
          from public.reading_sessions
          where user_id = target_user_id
            and session_date = check_date
            and pages_read > 0
        ) into has_reading;
        
        if not has_reading then
          exit;
        end if;
        
        streak_count := streak_count + 1;
        check_date := check_date - interval '1 day';
      else
        exit;
      end if;
    else
      streak_count := streak_count + 1;
      check_date := check_date - interval '1 day';
    end if;
  end loop;
  
  return streak_count;
end;
$$;

-- Add comment for documentation
comment on function public.get_user_reading_streak(uuid, text) is 
  'Calculates the number of consecutive reading days ending today or yesterday for a given user. 
   Returns 0 if no recent reading activity.
   user_timezone parameter allows adjusting for the user''s local timezone (defaults to UTC).';

-- Grant execute permission to authenticated users
grant execute on function public.get_user_reading_streak(uuid, text) to authenticated;

