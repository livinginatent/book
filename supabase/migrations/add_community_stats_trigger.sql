-- 1. Add columns to the books table
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS aggregate_rating numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS ratings_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS common_moods text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS global_pacing text,
ADD COLUMN IF NOT EXISTS global_difficulty text;

-- 2. Create the aggregation function (FIXED to handle DELETE)
CREATE OR REPLACE FUNCTION update_global_book_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_book_id uuid;
BEGIN
    -- Determine which book_id to update
    -- For DELETE operations, use OLD; for INSERT/UPDATE, use NEW
    IF (TG_OP = 'DELETE') THEN
        target_book_id := OLD.book_id;
    ELSE
        target_book_id := NEW.book_id;
    END IF;

    UPDATE public.books
    SET 
        -- 1. Calculate Average Rating and Count
        aggregate_rating = (
            SELECT AVG(rating) 
            FROM public.user_books 
            WHERE book_id = target_book_id AND rating IS NOT NULL
        ),
        ratings_count = (
            SELECT COUNT(rating) 
            FROM public.user_books 
            WHERE book_id = target_book_id AND rating IS NOT NULL
        ),

        -- 2. Find most common pacing (The Mode)
        global_pacing = (
            SELECT review_attributes->>'pacing'
            FROM public.user_books
            WHERE book_id = target_book_id AND review_attributes->>'pacing' IS NOT NULL
            GROUP BY review_attributes->>'pacing'
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ),

        -- 3. Find most common difficulty
        global_difficulty = (
            SELECT review_attributes->>'difficulty'
            FROM public.user_books
            WHERE book_id = target_book_id AND review_attributes->>'difficulty' IS NOT NULL
            GROUP BY review_attributes->>'difficulty'
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ),

        -- 4. Aggregate Top 5 Moods
        common_moods = (
            SELECT ARRAY(
                SELECT mood
                FROM public.user_books, 
                     jsonb_array_elements_text(review_attributes->'moods') AS mood
                WHERE book_id = target_book_id
                GROUP BY mood
                ORDER BY COUNT(*) DESC
                LIMIT 5
            )
        )
    WHERE id = target_book_id;

    -- Return appropriate record based on operation
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_global_book_stats ON public.user_books;

-- 4. Create the trigger
CREATE TRIGGER trigger_update_global_book_stats
AFTER INSERT OR UPDATE OR DELETE ON public.user_books
FOR EACH ROW
EXECUTE FUNCTION update_global_book_stats();

-- 5. Backfill existing data (run once to populate stats for existing books)
DO $$
DECLARE
    book_record RECORD;
BEGIN
    FOR book_record IN 
        SELECT DISTINCT book_id FROM public.user_books WHERE rating IS NOT NULL
    LOOP
        UPDATE public.books
        SET 
            aggregate_rating = (
                SELECT AVG(rating) 
                FROM public.user_books 
                WHERE book_id = book_record.book_id AND rating IS NOT NULL
            ),
            ratings_count = (
                SELECT COUNT(rating) 
                FROM public.user_books 
                WHERE book_id = book_record.book_id AND rating IS NOT NULL
            ),
            global_pacing = (
                SELECT review_attributes->>'pacing'
                FROM public.user_books
                WHERE book_id = book_record.book_id AND review_attributes->>'pacing' IS NOT NULL
                GROUP BY review_attributes->>'pacing'
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ),
            global_difficulty = (
                SELECT review_attributes->>'difficulty'
                FROM public.user_books
                WHERE book_id = book_record.book_id AND review_attributes->>'difficulty' IS NOT NULL
                GROUP BY review_attributes->>'difficulty'
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ),
            common_moods = (
                SELECT ARRAY(
                    SELECT mood
                    FROM public.user_books, 
                         jsonb_array_elements_text(review_attributes->'moods') AS mood
                    WHERE book_id = book_record.book_id
                    GROUP BY mood
                    ORDER BY COUNT(*) DESC
                    LIMIT 5
                )
            )
        WHERE id = book_record.book_id;
    END LOOP;
END $$;

