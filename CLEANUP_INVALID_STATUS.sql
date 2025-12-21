-- ============================================
-- CLEANUP SCRIPT: Fix invalid 'dnf' status in user_books
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Temporarily add 'dnf' to the enum so we can query it
ALTER TYPE reading_status ADD VALUE IF NOT EXISTS 'dnf';

-- Step 2: Update all 'dnf' rows to 'did_not_finish'
UPDATE user_books
SET status = 'did_not_finish'
WHERE status = 'dnf';

-- Step 3: Recreate the enum without 'dnf'
-- Create new enum with only valid values
CREATE TYPE reading_status_new AS ENUM (
    'want_to_read',
    'currently_reading',
    'finished',
    'did_not_finish',
    'up_next'
);

-- Update the table column to use the new enum
ALTER TABLE user_books 
    ALTER COLUMN status TYPE reading_status_new 
    USING status::text::reading_status_new;

-- Drop the old enum
DROP TYPE reading_status;

-- Rename the new enum to the original name
ALTER TYPE reading_status_new RENAME TO reading_status;

-- Done! All invalid 'dnf' values have been converted to 'did_not_finish'

