# Running the Smart Recommendations Migration

## Prerequisites
- Supabase CLI installed
- Supabase project configured
- Database connection established

## Steps

### 1. Set up DeepSeek API Key

First, get your API key from [DeepSeek Platform](https://platform.deepseek.com/) and add it to your environment:

```bash
# Add to .env.local
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

### 2. Run the Database Migration

If using Supabase CLI:

```bash
# Option A: Run the specific migration
supabase db push

# Option B: Run all pending migrations
supabase migration up
```

If using Supabase Dashboard:
1. Go to your project dashboard
2. Navigate to SQL Editor
3. Copy contents of `supabase/migrations/027_create_recommendation_cache.sql`
4. Paste and run in SQL Editor

### 3. Verify Migration

Check that the table was created:

```sql
-- Run in SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'recommendation_cache';
```

Should return:
```
table_name
-------------------
recommendation_cache
```

### 4. Test the Feature

#### Test Free Tier (3 recommendations)
```typescript
// Make sure user has at least 3 finished books
const result = await getSmartRecommendations();
console.log(result);
```

#### Test Premium Tier (10 recommendations)
```typescript
// User should have 'bibliophile' subscription_tier
// and at least 10 highly-rated finished books
const result = await getSmartRecommendations();
console.log(result);
```

### 5. Verify Caching

```sql
-- Check cached recommendations
SELECT 
  id,
  user_id,
  tier,
  generated_at,
  expires_at,
  jsonb_array_length(recommendations) as recommendation_count
FROM recommendation_cache;
```

### 6. Test Cache Expiration

The cache expires after 7 days. To test immediate refresh:

```typescript
// Clear cache manually
await clearRecommendationCache();

// Get fresh recommendations
const result = await getSmartRecommendations();
```

## Troubleshooting

### Issue: Migration fails with "table already exists"
**Solution**: Table might already be created. Check with:
```sql
SELECT * FROM recommendation_cache LIMIT 1;
```

### Issue: API returns "DeepSeek API key not configured"
**Solution**: Verify environment variable is set and server is restarted:
```bash
# Check env var
echo $DEEPSEEK_API_KEY

# Restart Next.js server
npm run dev
```

### Issue: "Unable to generate recommendations"
**Cause**: User doesn't have enough finished books
**Solution**: 
- Free tier needs at least 3 finished books
- Premium tier needs at least 10 books with ratings ≥ 4

### Issue: Slow first request
**Expected Behavior**: First request hits the API and takes 2-5 seconds
**Subsequent requests**: Instant (served from cache)

### Issue: RLS policies blocking access
**Solution**: Verify user is authenticated:
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'recommendation_cache';
```

## Rollback (if needed)

To rollback the migration:

```sql
-- Drop the table and related objects
DROP TABLE IF EXISTS public.recommendation_cache CASCADE;
DROP FUNCTION IF EXISTS update_recommendation_cache_updated_at CASCADE;
```

Then remove from types:

```typescript
// In types/database.types.ts
// Remove the recommendation_cache table definition
```

## Performance Expectations

- **First Request**: 2-5 seconds (API call)
- **Cached Request**: < 100ms (database lookup)
- **Cache Duration**: 7 days
- **Cache Hit Rate**: Should be > 95% after initial requests

## Next Steps

After successful migration:

1. ✅ Update dashboard to use `SmartBookRecommendations` component
2. ✅ Test with different user tiers
3. ✅ Monitor API usage and costs
4. ✅ Collect user feedback on recommendation quality
5. ✅ Consider implementing recommendation feedback system

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify all environment variables are set
3. Ensure user has sufficient reading history
4. Test API key with a direct curl request:

```bash
curl https://api.deepseek.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "test"}]
  }'
```
