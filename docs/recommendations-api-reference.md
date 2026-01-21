# Smart Recommendations API Reference

## Server Actions

### `getSmartRecommendations()`

Get AI-powered book recommendations for the current user.

**Parameters**: None (uses authenticated user from cookies)

**Returns**: `Promise<SmartRecommendationsResult | SmartRecommendationsError>`

**Success Response**:
```typescript
{
  success: true,
  recommendations: BookRecommendation[],
  tier: "free" | "bibliophile",
  cachedAt?: string  // ISO timestamp if from cache
}
```

**Error Response**:
```typescript
{
  success: false,
  error: string
}
```

**Example**:
```typescript
import { getSmartRecommendations } from "@/app/actions/recommendations";

const result = await getSmartRecommendations();

if (result.success) {
  console.log(`Found ${result.recommendations.length} recommendations`);
  console.log(`User tier: ${result.tier}`);
  
  result.recommendations.forEach(rec => {
    console.log(`${rec.title} by ${rec.author} (${rec.matchPercentage}% match)`);
  });
}
```

---

### `clearRecommendationCache()`

Clear cached recommendations for the current user, forcing a fresh generation on next request.

**Parameters**: None

**Returns**: `Promise<{ success: boolean; error?: string }>`

**Example**:
```typescript
import { clearRecommendationCache } from "@/app/actions/recommendations";

const result = await clearRecommendationCache();

if (result.success) {
  console.log("Cache cleared successfully");
}
```

---

## Types

### `BookRecommendation`

```typescript
interface BookRecommendation {
  title: string;           // Book title
  author: string;          // Primary author name
  matchPercentage: number; // 0-100, how well it matches user's profile
  reason: string;          // Explanation why it's recommended
  genres?: string[];       // Optional genre tags
}
```

### `SmartRecommendationsResult`

```typescript
interface SmartRecommendationsResult {
  success: true;
  recommendations: BookRecommendation[];
  tier: "free" | "bibliophile";
  cachedAt?: string;  // ISO timestamp
}
```

### `SmartRecommendationsError`

```typescript
interface SmartRecommendationsError {
  success: false;
  error: string;
}
```

---

## Database Schema

### `recommendation_cache` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `tier` | TEXT | User's subscription tier |
| `recommendations` | JSONB | Array of BookRecommendation |
| `generated_at` | TIMESTAMPTZ | When recommendations were generated |
| `expires_at` | TIMESTAMPTZ | Cache expiration (default +7 days) |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes**:
- `idx_recommendation_cache_user_id` on `user_id`
- `idx_recommendation_cache_expires_at` on `expires_at`

**RLS Policies**:
- Users can only access their own recommendations
- Full CRUD operations allowed for own records

---

## Recommendation Logic

### Free Tier

**Required Data**:
- At least 3 finished books
- Book subjects/genres

**Algorithm**:
1. Fetch last 3 finished books (ordered by `date_finished`)
2. Extract titles, authors
3. Count subject frequency across all finished books
4. Select top 2 subjects
5. Send to DeepSeek API with similarity prompt
6. Return 3 recommendations

**Prompt Template**:
```
Based on a reader who recently finished:
- [Book 1] by [Author]
- [Book 2] by [Author]
- [Book 3] by [Author]

And enjoys these genres: [Genre1], [Genre2]

Recommend 3 similar books...
```

### Premium Tier (Bibliophile)

**Required Data**:
- At least 10 books with ratings ≥ 4
- Reading DNA data (from `getReadingDNA()`)

**Algorithm**:
1. Fetch Reading DNA profile
2. Extract winning combo, moods, pacing, difficulty, subjects
3. Fetch top 10 highest-rated books
4. Send comprehensive profile to DeepSeek API
5. Return 10 highly personalized recommendations

**Prompt Template**:
```
READING DNA PROFILE:
- Winning Combo: [subject + pacing]
- Favorite Moods: [mood1, mood2, mood3]
- Preferred Pacing: [pacing]
- Complexity Level: [difficulty]
- Top Genres: [5 genres]

TOP RATED BOOKS (4+ stars):
- [10 books with ratings]

Recommend 10 books matching this DNA profile...
```

---

## Cache Strategy

### Cache Key
- `user_id` + `tier`
- If tier changes, new recommendations are generated

### Cache Duration
- **Default**: 7 days
- **Rationale**: Balance between freshness and API costs

### Cache Invalidation
- **Automatic**: After 7 days (expires_at)
- **Manual**: Call `clearRecommendationCache()`
- **Tier Change**: New cache entry created

### Cache Hit Rate
- **Expected**: > 95%
- **Typical User**: 1-2 API calls per year

---

## Error Codes

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "You must be logged in" | No authenticated user | Ensure user is signed in |
| "Failed to fetch user profile" | Database error | Check Supabase connection |
| "DeepSeek API key not configured" | Missing env var | Set DEEPSEEK_API_KEY |
| "Unable to generate recommendations" | Insufficient reading history | User needs more finished books |
| "No content returned from DeepSeek API" | API response error | Check API status/quota |

---

## Performance Metrics

### Response Times

| Scenario | Expected Time |
|----------|--------------|
| Cache hit | < 100ms |
| Free tier (cold) | 2-4 seconds |
| Premium tier (cold) | 3-5 seconds |
| Cache refresh | 2-5 seconds |

### Token Usage

| Tier | Tokens per Request | Cached Duration |
|------|-------------------|----------------|
| Free | ~200 tokens | 7 days |
| Premium | ~800-1000 tokens | 7 days |

### Cost Estimates (DeepSeek Pricing)

Assuming $0.14 per 1M tokens (DeepSeek pricing):

| Tier | Cost per Request | Requests per User/Year | Annual Cost per User |
|------|-----------------|----------------------|-------------------|
| Free | $0.000028 | ~2 | $0.000056 |
| Premium | $0.00014 | ~2 | $0.00028 |

**With 10,000 users**:
- Free tier: ~$0.56/year
- Premium tier: ~$2.80/year
- **Total**: ~$3.36/year for all recommendations

---

## Best Practices

### 1. Check Cache First
The action automatically checks cache, but you can inform users if using cached data:

```typescript
const result = await getSmartRecommendations();
if (result.success && result.cachedAt) {
  const cacheAge = Date.now() - new Date(result.cachedAt).getTime();
  const daysOld = Math.floor(cacheAge / (1000 * 60 * 60 * 24));
  console.log(`Using ${daysOld}-day-old recommendations`);
}
```

### 2. Handle Loading States
Always show loading indicators for initial requests:

```tsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  getSmartRecommendations().then(result => {
    setRecommendations(result.recommendations);
    setLoading(false);
  });
}, []);
```

### 3. Graceful Degradation
If recommendations fail, fall back to simple suggestions:

```typescript
const result = await getSmartRecommendations();

if (!result.success) {
  // Show manual recommendations or popular books
  return <FallbackRecommendations />;
}
```

### 4. Refresh on Major Events
Clear cache when user's reading profile changes significantly:

```typescript
// After importing many books
await clearRecommendationCache();

// After finishing highly-rated book
if (rating >= 4) {
  await clearRecommendationCache();
}
```

---

## Testing

### Unit Test Example

```typescript
import { getSmartRecommendations } from "@/app/actions/recommendations";

describe("Smart Recommendations", () => {
  it("should return recommendations for free tier", async () => {
    const result = await getSmartRecommendations();
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.tier).toBe("free");
      
      result.recommendations.forEach(rec => {
        expect(rec.title).toBeDefined();
        expect(rec.author).toBeDefined();
        expect(rec.matchPercentage).toBeGreaterThanOrEqual(0);
        expect(rec.matchPercentage).toBeLessThanOrEqual(100);
      });
    }
  });
});
```

### Integration Test

```bash
# Test with curl (after getting session token)
curl -X POST http://localhost:3000/api/recommendations \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Monitoring Queries

### Check Cache Statistics

```sql
-- Cache hit rate
SELECT 
  COUNT(*) as total_cached,
  COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as valid_cache,
  COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_cache
FROM recommendation_cache;

-- Average cache age
SELECT 
  tier,
  AVG(EXTRACT(EPOCH FROM (NOW() - generated_at)) / 86400) as avg_age_days
FROM recommendation_cache
WHERE expires_at > NOW()
GROUP BY tier;

-- Recommendations per tier
SELECT 
  tier,
  COUNT(*) as user_count,
  AVG(jsonb_array_length(recommendations)) as avg_recommendations
FROM recommendation_cache
WHERE expires_at > NOW()
GROUP BY tier;
```

### User Coverage

```sql
-- Users with cached recommendations
SELECT 
  COUNT(DISTINCT rc.user_id) as users_with_cache,
  COUNT(DISTINCT p.id) as total_users,
  ROUND(COUNT(DISTINCT rc.user_id)::numeric / COUNT(DISTINCT p.id) * 100, 2) as coverage_percent
FROM profiles p
LEFT JOIN recommendation_cache rc ON p.id = rc.user_id AND rc.expires_at > NOW();
```
