-- ============================================
-- ADD bio COLUMN TO profiles TABLE
-- Allows users to add a short biography/description
-- ============================================

-- Add bio column to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS bio text;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.bio IS 'User biography or description (max 300 characters recommended)';

