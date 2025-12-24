-- ============================================
-- UPDATE GOAL TYPE ENUM
-- Add 'consistency' to goal_type enum
-- ============================================

-- Add 'consistency' value to the enum if it doesn't exist
-- Note: PostgreSQL doesn't support removing enum values easily,
-- so we keep 'streak' for backward compatibility but use 'consistency' going forward
DO $$ 
BEGIN
  -- Check if 'consistency' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'consistency' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'goal_type')
  ) THEN
    -- Add 'consistency' to the enum
    ALTER TYPE goal_type ADD VALUE 'consistency';
  END IF;
END $$;

-- Update any existing 'streak' goals to 'consistency'
-- (Optional: only if you want to migrate existing data)
-- UPDATE public.reading_goals SET type = 'consistency' WHERE type = 'streak';

-- Update comments to reflect the new type
COMMENT ON TYPE goal_type IS 'Goal type: books, pages, diversity, consistency (streak is deprecated)';

