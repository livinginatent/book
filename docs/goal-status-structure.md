# Reading Goals Status Structure

## Overview

The reading goals system has been enhanced with proper status tracking to distinguish between active, completed, and archived goals.

## Database Schema

### New Fields

1. **`status`** (enum: `goal_status`)
   - Values: `'active'`, `'completed'`, `'archived'`
   - Default: `'active'`
   - Purpose: Clear lifecycle tracking of goals

2. **`completed_at`** (timestamp)
   - Records when a goal was marked as completed
   - Only set when `status = 'completed'`
   - Useful for sorting and displaying achieved goals

### Status Meanings

- **`active`**: Goal is currently being tracked. User is working towards this goal.
- **`completed`**: Goal has been achieved (current >= target). Automatically set when target is reached.
- **`archived`**: Goal was manually deactivated before completion. User stopped tracking this goal.

## Migration

The migration (`019_add_goal_status_tracking.sql`) will:
1. Create the `goal_status` enum type
2. Add `status` and `completed_at` columns
3. Migrate existing data:
   - `is_active = true` → `status = 'active'`
   - `is_active = false` → `status = 'archived'`
4. Create indexes for efficient querying
5. Add a database function `mark_goal_completed()` for marking goals as completed

## Automatic Completion

Goals are automatically marked as `completed` when:
- The calculated `current` progress >= `target`
- The goal has `status = 'active'`
- This happens when fetching active goals via `getAllActiveGoals()`

The `mark_goal_completed()` function:
- Sets `status = 'completed'`
- Sets `is_active = false`
- Sets `completed_at = now()`

## API Changes

### `getAllActiveGoals()`
- Returns only goals with `status = 'active'`
- Automatically checks and marks goals as completed if they're achieved
- Filters out newly completed goals from the response

### `getAllAchievedGoals()`
- Returns goals with `status = 'completed'`
- Falls back to checking `current >= target` for pre-migration data
- Orders by `completed_at` (most recent first)

### Goal Creation
- New goals are created with `status = 'active'` and `is_active = true`
- When creating a new goal, existing active goals are set to `status = 'archived'`

## Config Structure

The `config` JSONB field structure remains the same:

### Active Goal Example:
```json
{
  "year": 2025,
  "target": 30,
  "current": 0,
  "is_public": true
}
```

### Completed Goal Example:
```json
{
  "year": 2025,
  "target": 2,
  "current": 2,
  "end_date": "2026-03-24T19:59:59.999Z",
  "is_public": true,
  "start_date": "2025-12-23T20:00:00.000Z",
  "period_months": 3
}
```

Note: The `current` value in config is historical. The actual current progress is calculated dynamically from `user_books` table.

## Benefits

1. **Clear Separation**: Active vs completed goals are clearly distinguished
2. **Better Queries**: Can efficiently query by status without calculating progress
3. **Historical Tracking**: `completed_at` timestamp allows sorting by completion date
4. **Backward Compatible**: Code works before and after migration
5. **Automatic Management**: Goals are automatically marked as completed when achieved

## Future Enhancements

- Add ability to manually archive goals
- Add ability to reactivate archived goals
- Add statistics based on completion dates
- Add goal streaks (consecutive completed goals)

