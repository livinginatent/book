# DeepSeek API Setup for Smart Recommendations

## Overview
The smart recommendations feature uses DeepSeek AI to generate personalized book recommendations based on user reading history and preferences.

## Getting Your API Key

1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key (it will only be shown once)

## Configuration

Add the DeepSeek API key to your environment variables:

```bash
# .env.local
DEEPSEEK_API_KEY=your_api_key_here
```

## Features by Tier

### Free Tier
- **Input**: Last 3 finished books + Top 2 subjects
- **Output**: 3 personalized book recommendations
- **Cache Duration**: 7 days

### Premium Tier (Bibliophile)
- **Input**: 
  - Reading DNA Profile (Winning Combo, Moods, Pacing, Difficulty)
  - Top 10 highest-rated books (4+ stars)
  - Top 5 genre preferences
- **Output**: 10 highly personalized book recommendations
- **Cache Duration**: 7 days

## API Usage

The system automatically:
- Caches recommendations for 7 days to minimize API calls
- Checks subscription tier to determine recommendation strategy
- Returns match percentage (0-100) for each recommendation
- Provides reasoning for each recommendation

## Database

Recommendations are cached in the `recommendation_cache` table:
- `user_id`: Links to the user
- `tier`: Subscription tier when recommendations were generated
- `recommendations`: JSON array of book recommendations
- `generated_at`: Timestamp of generation
- `expires_at`: Cache expiration (7 days from generation)

## Server Actions

### `getSmartRecommendations()`
Main function to get recommendations. Automatically:
1. Checks for cached valid recommendations
2. If no cache, generates new recommendations based on tier
3. Caches results for future requests

### `clearRecommendationCache()`
Clears cached recommendations for the current user, forcing a refresh on next request.

## Response Format

```typescript
{
  success: true,
  recommendations: [
    {
      title: "Book Title",
      author: "Author Name",
      matchPercentage: 92,
      reason: "Matches your love for dark fantasy with complex characters",
      genres: ["Fantasy", "Dark Fantasy"]
    }
  ],
  tier: "bibliophile",
  cachedAt?: "2026-01-13T12:00:00Z"
}
```

## Cost Optimization

- Recommendations are cached for 7 days
- Free tier uses minimal tokens (3 books → 3 recommendations)
- Premium tier uses more tokens but provides deeper analysis
- Cache prevents redundant API calls for the same user

## Migration

Run the migration to create the necessary table:

```bash
# The migration file is located at:
# supabase/migrations/027_create_recommendation_cache.sql
```
