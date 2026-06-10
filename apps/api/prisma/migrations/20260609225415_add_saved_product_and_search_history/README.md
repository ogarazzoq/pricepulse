# Migration: Add SavedProduct and SearchHistory

## Overview
This migration adds two new tables to support the PricePulse Engagement Suite:
- `SavedProduct`: Allows users to save/favorite products
- `SearchHistory`: Tracks user search history with deduplication

## Changes

### New Tables

#### SavedProduct
- `id` (TEXT, PK): CUID primary key
- `userId` (TEXT, FK): Foreign key to User.id with CASCADE delete
- `productId` (TEXT, FK): Foreign key to Product.id with CASCADE delete
- `createdAt` (TIMESTAMP): Creation timestamp

**Constraints:**
- Unique constraint on `(userId, productId)` - prevents duplicate saves
- Index on `userId` for fast lookup

#### SearchHistory
- `id` (TEXT, PK): CUID primary key
- `userId` (TEXT, FK): Foreign key to User.id with CASCADE delete
- `query` (TEXT): Original search query
- `normalizedQuery` (TEXT): Normalized query for deduplication
- `searchCount` (INTEGER): Number of times this query was searched (default 1)
- `lastSearchedAt` (TIMESTAMP): Last search timestamp
- `createdAt` (TIMESTAMP): Creation timestamp

**Constraints:**
- Unique constraint on `(userId, normalizedQuery)` - prevents duplicate entries
- Index on `userId` for fast lookup
- Index on `(userId, lastSearchedAt)` for recent searches queries

## Validation

### Requirements Met

**Requirement 1.1**: SavedProduct model with required fields ✓
- id (cuid) ✓
- userId (FK cascade) ✓
- productId (FK cascade) ✓
- createdAt ✓

**Requirement 1.2**: Composite unique constraint on (userId, productId) ✓

**Requirement 1.7**: Non-unique index on userId ✓

**Requirement 6**: SearchHistory model with required fields ✓
- id, userId, query, normalizedQuery, searchCount, lastSearchedAt, createdAt ✓

**Requirement 6.2**: Unique constraint on (userId, normalizedQuery) ✓
- Non-unique index on userId ✓
- Non-unique index on (userId, lastSearchedAt) ✓

## Testing

To apply this migration when the database is available:

```bash
cd apps/api
npx prisma migrate deploy
```

To reset and apply all migrations:

```bash
cd apps/api
npx prisma migrate reset
```

## Rollback

To rollback this migration, drop both tables:

```sql
DROP TABLE IF EXISTS "SearchHistory" CASCADE;
DROP TABLE IF EXISTS "SavedProduct" CASCADE;
```
