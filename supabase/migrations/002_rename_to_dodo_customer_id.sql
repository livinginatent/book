-- ============================================
-- RENAME stripe_customer_id to dodo_customer_id
-- Run this after 001_create_profiles.sql
-- ============================================

-- Rename the column
ALTER TABLE public.profiles 
RENAME COLUMN stripe_customer_id TO dodo_customer_id;

-- Rename the index
DROP INDEX IF EXISTS profiles_stripe_customer_id_idx;
CREATE INDEX IF NOT EXISTS profiles_dodo_customer_id_idx ON public.profiles(dodo_customer_id);

