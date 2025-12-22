-- ============================================
-- ADD GOODREADS IMPORT FLAG TO PROFILES
-- Tracks if user has imported from Goodreads
-- ============================================

-- Add has_imported_from_goodreads column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_imported_from_goodreads boolean DEFAULT false NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.has_imported_from_goodreads IS 'Indicates if the user has completed a Goodreads import';

