-- ============================================
-- CLEANUP OPEN LIBRARY BOOKS
-- Removes books that only have open_library_id (no google_books_id)
-- ============================================

-- STEP 1: Preview what will be deleted (run this first to see what will be removed)
-- This shows books that have open_library_id but NO google_books_id
SELECT 
  id,
  open_library_id,
  google_books_id,
  title,
  authors,
  created_at
FROM public.books
WHERE open_library_id IS NOT NULL 
  AND google_books_id IS NULL
ORDER BY created_at DESC;

-- STEP 2: Count how many will be deleted
SELECT COUNT(*) as books_to_delete
FROM public.books
WHERE open_library_id IS NOT NULL 
  AND google_books_id IS NULL;

-- STEP 3: Check for related data that will be cascade deleted
-- (reading_sessions, reading_journal, reading_progress have CASCADE)
SELECT 
  'reading_sessions' as table_name,
  COUNT(*) as related_records
FROM public.reading_sessions rs
INNER JOIN public.books b ON rs.book_id = b.id
WHERE b.open_library_id IS NOT NULL 
  AND b.google_books_id IS NULL

UNION ALL

SELECT 
  'reading_journal' as table_name,
  COUNT(*) as related_records
FROM public.reading_journal rj
INNER JOIN public.books b ON rj.book_id = b.id
WHERE b.open_library_id IS NOT NULL 
  AND b.google_books_id IS NULL

UNION ALL

SELECT 
  'reading_progress' as table_name,
  COUNT(*) as related_records
FROM public.reading_progress rp
INNER JOIN public.books b ON rp.book_id = b.id
WHERE b.open_library_id IS NOT NULL 
  AND b.google_books_id IS NULL

UNION ALL

SELECT 
  'user_books' as table_name,
  COUNT(*) as related_records
FROM public.user_books ub
INNER JOIN public.books b ON ub.book_id = b.id
WHERE b.open_library_id IS NOT NULL 
  AND b.google_books_id IS NULL;

-- STEP 4: ACTUAL DELETION (uncomment to execute)
-- WARNING: This will permanently delete books and all related data!
-- Make sure you've reviewed the preview queries above!

-- BEGIN;
-- 
-- DELETE FROM public.books
-- WHERE open_library_id IS NOT NULL 
--   AND google_books_id IS NULL;
-- 
-- -- Verify deletion
-- SELECT COUNT(*) as remaining_open_library_books
-- FROM public.books
-- WHERE open_library_id IS NOT NULL;
-- 
-- -- If everything looks good, commit:
-- -- COMMIT;
-- -- Otherwise, rollback:
-- -- ROLLBACK;

-- ============================================
-- ALTERNATIVE: Delete ALL books with open_library_id
-- (even if they also have google_books_id)
-- ============================================

-- If you want to delete ALL books that have open_library_id (regardless of google_books_id):
-- 
-- BEGIN;
-- 
-- DELETE FROM public.books
-- WHERE open_library_id IS NOT NULL;
-- 
-- COMMIT;

