-- ============================================
-- ADD PAUSED STATUS TO READING_STATUS ENUM
-- ============================================

-- Add 'paused' to reading_status enum
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    where t.typname = 'reading_status'
      and e.enumlabel = 'paused'
  ) then
    alter type reading_status add value 'paused';
  end if;
end;
$$;

