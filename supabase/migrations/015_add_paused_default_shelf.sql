-- ============================================
-- ADD PAUSED DEFAULT SHELF
-- Adds "Paused" as a default shelf for all users
-- ============================================

-- Insert "Paused" default shelf for all existing users who don't already have it
INSERT INTO public.shelves (user_id, name, type, status)
SELECT
  p.id,
  'Paused',
  'default'::shelf_type,
  'paused'::reading_status
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.shelves sh
  WHERE sh.user_id = p.id
    AND sh.name = 'Paused'
);

-- Add comment for documentation
COMMENT ON TABLE public.shelves IS 'Stores default and custom shelves per user. Default shelves include: Currently Reading, Want to Read, Up Next, Did Not Finish, Finished, and Paused';

