-- ============================================
-- ADD SUBJECTS COLUMN TO USER_BOOKS TABLE
-- ============================================

-- Step 1: Add subjects column to user_books table
ALTER TABLE public.user_books
  ADD COLUMN IF NOT EXISTS subjects text[] DEFAULT '{}';

-- Step 2: Add comment
COMMENT ON COLUMN public.user_books.subjects IS 'Book subjects/categories copied from the books table for easier querying';

-- Step 3: Create function to sync subjects from books table
CREATE OR REPLACE FUNCTION sync_user_books_subjects()
RETURNS TRIGGER AS $$
BEGIN
  -- Copy subjects from books table when user_book is inserted or updated
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    NEW.subjects := (
      SELECT subjects
      FROM public.books
      WHERE id = NEW.book_id
    );
    
    -- If subjects is null, set to empty array
    IF NEW.subjects IS NULL THEN
      NEW.subjects := '{}';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to automatically sync subjects
DROP TRIGGER IF EXISTS trigger_sync_user_books_subjects ON public.user_books;

CREATE TRIGGER trigger_sync_user_books_subjects
  BEFORE INSERT OR UPDATE ON public.user_books
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_books_subjects();

-- Step 5: Backfill existing user_books records with subjects from books table
UPDATE public.user_books ub
SET subjects = COALESCE(b.subjects, '{}')
FROM public.books b
WHERE ub.book_id = b.id
  AND (ub.subjects IS NULL OR ub.subjects = '{}');

-- Step 6: Create index for better query performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_user_books_subjects ON public.user_books USING GIN (subjects);

