-- ============================================
-- MIGRATE FROM PROFILE ARRAYS TO USER_BOOKS TABLE
-- This migration syncs existing data from profile arrays to user_books
-- and ensures user_books is the single source of truth going forward
-- ============================================

-- Step 1: Migrate existing currently_reading books to user_books
INSERT INTO user_books (user_id, book_id, status, date_added, created_at, updated_at)
SELECT 
    id as user_id,
    unnest(currently_reading) as book_id,
    'currently_reading'::reading_status as status,
    now() as date_added,
    now() as created_at,
    now() as updated_at
FROM profiles
WHERE array_length(currently_reading, 1) > 0
ON CONFLICT (user_id, book_id) DO NOTHING;

-- Step 2: Migrate existing want_to_read books to user_books
INSERT INTO user_books (user_id, book_id, status, date_added, created_at, updated_at)
SELECT 
    id as user_id,
    unnest(want_to_read) as book_id,
    'want_to_read'::reading_status as status,
    now() as date_added,
    now() as created_at,
    now() as updated_at
FROM profiles
WHERE array_length(want_to_read, 1) > 0
ON CONFLICT (user_id, book_id) DO NOTHING;

-- Step 3: Migrate existing up_next books to user_books
INSERT INTO user_books (user_id, book_id, status, date_added, created_at, updated_at)
SELECT 
    id as user_id,
    unnest(up_next) as book_id,
    'up_next'::reading_status as status,
    now() as date_added,
    now() as created_at,
    now() as updated_at
FROM profiles
WHERE array_length(up_next, 1) > 0
ON CONFLICT (user_id, book_id) DO NOTHING;

-- Step 4: Migrate existing did_not_finish books to user_books
INSERT INTO user_books (user_id, book_id, status, date_added, created_at, updated_at)
SELECT 
    id as user_id,
    unnest(did_not_finish) as book_id,
    'dnf'::reading_status as status,
    now() as date_added,
    now() as created_at,
    now() as updated_at
FROM profiles
WHERE array_length(did_not_finish, 1) > 0
ON CONFLICT (user_id, book_id) DO NOTHING;

-- Step 5: Create reading_progress entries for currently_reading books that don't have progress yet
INSERT INTO reading_progress (user_id, book_id, pages_read, started_at, last_read_at, created_at, updated_at)
SELECT 
    ub.user_id,
    ub.book_id,
    0 as pages_read,
    COALESCE(ub.date_started, ub.date_added) as started_at,
    now() as last_read_at,
    now() as created_at,
    now() as updated_at
FROM user_books ub
WHERE ub.status = 'currently_reading'
AND NOT EXISTS (
    SELECT 1 FROM reading_progress rp 
    WHERE rp.user_id = ub.user_id AND rp.book_id = ub.book_id
)
ON CONFLICT (user_id, book_id) DO NOTHING;

-- Note: We keep the profile array columns for now for backward compatibility
-- but they should no longer be used for new operations
-- Future: Consider removing these columns after confirming everything works

