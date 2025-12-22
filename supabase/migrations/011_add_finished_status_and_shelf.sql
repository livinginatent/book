-- ============================================
-- ADD FINISHED STATUS AND DEFAULT SHELF
-- ============================================

-- 1) Ensure reading_status enum has 'finished'
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    where t.typname = 'reading_status'
      and e.enumlabel = 'finished'
  ) then
    alter type reading_status add value 'finished';
  end if;
end;
$$;

-- 2) Seed 'Finished' default shelf for existing users if not present
insert into public.shelves (user_id, name, type, status)
select
  p.id,
  'Finished',
  'default'::shelf_type,
  'finished'::reading_status
from public.profiles p
where not exists (
  select 1
  from public.shelves sh
  where sh.user_id = p.id
    and sh.name = 'Finished'
);


