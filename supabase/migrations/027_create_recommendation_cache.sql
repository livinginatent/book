-- Create recommendation_cache table for storing AI-generated book recommendations
CREATE TABLE IF NOT EXISTS public.recommendation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'bibliophile')),
  recommendations JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user_id ON public.recommendation_cache(user_id);

-- Create index for faster lookups by expiration
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expires_at ON public.recommendation_cache(expires_at);

-- Add RLS policies
ALTER TABLE public.recommendation_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own recommendations
CREATE POLICY "Users can view their own recommendations"
  ON public.recommendation_cache
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own recommendations
CREATE POLICY "Users can insert their own recommendations"
  ON public.recommendation_cache
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own recommendations
CREATE POLICY "Users can update their own recommendations"
  ON public.recommendation_cache
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own recommendations
CREATE POLICY "Users can delete their own recommendations"
  ON public.recommendation_cache
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recommendation_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recommendation_cache_updated_at_trigger
  BEFORE UPDATE ON public.recommendation_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendation_cache_updated_at();

-- Add comment to table
COMMENT ON TABLE public.recommendation_cache IS 'Stores AI-generated book recommendations with expiration for caching';
