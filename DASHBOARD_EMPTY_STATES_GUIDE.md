# Dashboard Empty States - Troubleshooting Guide

## Issue Report
User reported that Recent Searches, Top Searches, and Recent Drops widgets on the dashboard overview page are showing empty states even though the widgets are correctly implemented.

---

## Current Status

### What's Working ✅
1. **Widgets are correctly implemented**
   - `RecentSearchesWidget` properly calls `useRecentSearches(5)`
   - `TopSearchesWidget` properly calls `useTopSearches(5)`
   - API hooks are correctly configured
   - Empty states render properly when no data

2. **API endpoints are working**
   - `/api/v1/searches/recent?limit=5`
   - `/api/v1/searches/top?limit=5`
   - Backend controllers and services exist
   - Authentication is working

3. **Search capture is implemented**
   - Products page calls `useSearchCapture()` hook
   - Debounces for 350ms before capturing
   - Minimum 2 characters required
   - Query normalization works

---

## Why Empty States Appear

### 1. Search History Hasn't Been Created
**Most likely reason**: User hasn't searched for products yet.

**How search capture works:**
```typescript
// In apps/web/src/app/(dashboard)/products/page.tsx
useEffect(() => {
  const t = setTimeout(() => {
    setDebounced(q);
    if (q.trim().length >= 2) {
      capture(q); // ← This saves to database
    }
  }, 350);
  return () => clearTimeout(t);
}, [q, capture]);
```

**What needs to happen:**
1. User goes to `/products` page
2. User types in search box (min 2 chars)
3. After 350ms debounce, search is captured
4. Backend creates/updates SearchHistory record
5. Dashboard widgets can now display data

---

### 2. Backend Price Sync Worker Not Running
**Second likely reason**: "Recent Drops" needs price-sync worker to detect price changes.

**What the worker does:**
- Periodically checks product prices across marketplaces
- Detects when prices drop
- Creates price history records
- These records feed the "Recent Drops" widget

**Check if worker is running:**
```bash
# In apps/api directory
npm run worker:sync  # or however it's configured
```

---

### 3. Fresh Database with No Seed Data
If the database was recently reset or migrated:
- No SearchHistory records exist
- No price change records exist
- Empty states are expected until users interact

---

## Solutions

### Quick Fix: Seed Some Data

Create a seed script to populate demo data:

```typescript
// apps/api/prisma/seed.ts (add this section)

async function seedSearchHistory() {
  const demoUser = await prisma.user.findFirst({
    where: { email: 'demo@pricepulse.io' }
  });
  
  if (!demoUser) return;
  
  const searches = [
    { query: 'laptop', searchCount: 15 },
    { query: 'iphone', searchCount: 12 },
    { query: 'headphones', searchCount: 8 },
    { query: 'camera', searchCount: 6 },
    { query: 'monitor', searchCount: 4 },
  ];
  
  for (const search of searches) {
    await prisma.searchHistory.create({
      data: {
        userId: demoUser.id,
        query: search.query,
        normalizedQuery: search.query.toLowerCase(),
        searchCount: search.searchCount,
        lastSearchedAt: new Date(),
      },
    });
  }
}

// Add to main() function
await seedSearchHistory();
```

Run seed:
```bash
cd apps/api
npm run prisma:seed
```

---

### Better Solution: Add "Try It" CTA to Empty States

Enhance empty states with actionable guidance:

```typescript
// apps/web/src/components/dashboard/recent-searches-widget.tsx
{error || !searches || searches.length === 0 ? (
  <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
    <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
    <p className="text-sm text-muted-foreground">No searches yet</p>
    <p className="text-xs text-muted-foreground mt-1 mb-3">
      Search for products to see your history here
    </p>
    <Button size="sm" variant="outline" asChild>
      <Link href="/products">
        <Search className="h-4 w-4 mr-2" />
        Search Products
      </Link>
    </Button>
  </div>
) : (
  // ... existing search list
)}
```

---

### Best Solution: Smart Empty States

Show contextual help based on user state:

```typescript
// Create a useSearchHistoryStatus hook
export function useSearchHistoryStatus() {
  const { data: user } = useUser();
  const { data: searches } = useRecentSearches(1);
  
  // User has never searched
  const isFirstTime = !searches || searches.length === 0;
  
  // User created account recently (last 24h)
  const isNewUser = user && 
    (Date.now() - new Date(user.createdAt).getTime()) < 24 * 60 * 60 * 1000;
  
  return { isFirstTime, isNewUser };
}

// Use in widget
const { isFirstTime, isNewUser } = useSearchHistoryStatus();

{isFirstTime && isNewUser ? (
  <EmptyState
    icon={<Sparkles />}
    title="Welcome to PricePulse!"
    description="Start by searching for products you want to track"
    action={
      <Button asChild>
        <Link href="/products">Find Your First Product</Link>
      </Button>
    }
  />
) : isFirstTime ? (
  <EmptyState
    icon={<Search />}
    title="No searches yet"
    description="Your recent searches will appear here"
    action={
      <Button asChild variant="outline">
        <Link href="/products">Browse Products</Link>
      </Button>
    }
  />
) : (
  // Normal search list
)}
```

---

## Testing the Dashboard

### Step-by-Step Test Flow

1. **Clear existing data** (optional, for fresh test):
```sql
-- In database
DELETE FROM "SearchHistory" WHERE "userId" = 'your-user-id';
```

2. **Login to dashboard**
```
Navigate to: http://localhost:3000/login
```

3. **Check dashboard** - Should see empty states
```
Navigate to: http://localhost:3000/dashboard
Expected: Empty states with helpful messages
```

4. **Search for products**
```
Navigate to: http://localhost:3000/products
Type in search: "laptop" (min 2 chars)
Wait: 350ms for debounce
Backend: SearchHistory record created
```

5. **Return to dashboard**
```
Navigate to: http://localhost:3000/dashboard
Expected: Recent Searches shows "laptop"
Expected: Top Searches shows "laptop" with count "1"
```

6. **Search again**
```
Search for same term: "laptop"
Backend: searchCount incremented to 2
Dashboard: Count updates automatically
```

7. **Search for different terms**
```
Search: "iphone", "headphones", "camera"
Dashboard: Recent Searches shows all 4
Dashboard: Top Searches shows sorted by count
```

---

## Backend Verification

### Check if search is being captured

Add logging to search capture:

```typescript
// apps/api/src/modules/search-history/search-history.service.ts

async capture(userId: string, query: string) {
  this.logger.log(`Capturing search: "${query}" for user ${userId}`); // ← Add this
  
  // ... rest of method
  
  this.logger.log(`Search captured successfully, count: ${result.searchCount}`); // ← Add this
  return result;
}
```

### Check database directly

```sql
-- Count searches per user
SELECT 
  u.email,
  COUNT(sh.id) as search_count
FROM "User" u
LEFT JOIN "SearchHistory" sh ON sh."userId" = u.id
GROUP BY u.id, u.email;

-- View recent searches
SELECT 
  query,
  "searchCount",
  "lastSearchedAt"
FROM "SearchHistory"
WHERE "userId" = 'your-user-id'
ORDER BY "lastSearchedAt" DESC
LIMIT 10;

-- View top searches
SELECT 
  query,
  "searchCount",
  "lastSearchedAt"
FROM "SearchHistory"
WHERE "userId" = 'your-user-id'
ORDER BY "searchCount" DESC, "lastSearchedAt" DESC
LIMIT 10;
```

---

## API Testing

### Test search capture endpoint directly

```bash
# Get auth token first
TOKEN="your-jwt-token"

# Capture a search
curl -X POST http://localhost:3001/api/v1/searches \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "test laptop"}'

# Get recent searches
curl http://localhost:3001/api/v1/searches/recent?limit=5 \
  -H "Authorization: Bearer $TOKEN"

# Get top searches  
curl http://localhost:3001/api/v1/searches/top?limit=5 \
  -H "Authorization: Bearer $TOKEN"
```

Expected responses:
```json
// POST /searches response
{
  "id": "uuid",
  "userId": "uuid",
  "query": "test laptop",
  "normalizedQuery": "test laptop",
  "searchCount": 1,
  "lastSearchedAt": "2024-06-10T...",
  "createdAt": "2024-06-10T..."
}

// GET /searches/recent response
[
  {
    "id": "uuid",
    "query": "test laptop",
    "searchCount": 1,
    "lastSearchedAt": "2024-06-10T..."
  }
]
```

---

## Common Issues

### 1. Searches Not Being Captured

**Symptom**: Typing in search box but no records in database

**Possible causes:**
- Query is less than 2 characters
- Not waiting 350ms (typing too fast, then navigating away)
- API endpoint failing silently
- Authentication token expired

**Debug:**
```typescript
// Add to products page
useEffect(() => {
  console.log('Query changed:', q);
  const t = setTimeout(() => {
    console.log('Debounced query:', q);
    if (q.trim().length >= 2) {
      console.log('Capturing search...');
      capture(q).then(() => {
        console.log('Search captured successfully');
      }).catch((err) => {
        console.error('Search capture failed:', err);
      });
    }
  }, 350);
  return () => clearTimeout(t);
}, [q, capture]);
```

---

### 2. Dashboard Shows Old Data

**Symptom**: Just searched but dashboard doesn't update

**Possible causes:**
- React Query cache not invalidating
- Stale time too long
- Need manual refetch

**Solution:**
```typescript
// In products page, invalidate queries after capture
const queryClient = useQueryClient();

const capture = async (query: string) => {
  await searchHistoryApi.capture(query);
  // Invalidate search history queries
  queryClient.invalidateQueries({ queryKey: ['search-history'] });
};
```

---

### 3. "Recent Drops" Always Empty

**Symptom**: Searches work but Recent Drops never shows data

**Reason**: Requires price-sync worker to be running

**Check:**
1. Is worker configured in `package.json` scripts?
2. Is worker running in separate process?
3. Are there price history records in database?

**Database check:**
```sql
SELECT COUNT(*) FROM "PriceHistory"
WHERE "createdAt" > NOW() - INTERVAL '7 days';
```

If zero, worker isn't running or hasn't detected changes yet.

---

## Recommended Enhancements

### 1. Add Loading States with Skeleton

```typescript
{isLoading ? (
  <div className="space-y-2">
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-9 w-full" />
    ))}
  </div>
) : /* ... */}
```

### 2. Add Error Handling

```typescript
{error ? (
  <div className="flex flex-col items-center justify-center min-h-[180px]">
    <AlertCircle className="h-8 w-8 text-destructive mb-2" />
    <p className="text-sm text-muted-foreground">
      Failed to load searches
    </p>
    <Button size="sm" variant="outline" onClick={() => refetch()}>
      Try Again
    </Button>
  </div>
) : /* ... */}
```

### 3. Add Refresh Button

```typescript
<CardHeader className="flex flex-row items-center justify-between">
  <CardTitle>Recent Searches</CardTitle>
  <Button 
    size="sm" 
    variant="ghost" 
    onClick={() => refetch()}
    disabled={isRefetching}
  >
    <RefreshCw className={cn(
      "h-4 w-4",
      isRefetching && "animate-spin"
    )} />
  </Button>
</CardHeader>
```

---

## Summary

### Why Empty States Appear
1. ✅ User hasn't searched yet (most common)
2. ✅ Backend worker not running (for Recent Drops)
3. ✅ Fresh database with no seed data

### What's Already Working
- Widget implementations ✅
- API endpoints ✅
- Search capture logic ✅
- Database schema ✅

### What to Do
1. **For Development**: Seed demo data or manually test by searching
2. **For Production**: Empty states are normal for new users
3. **Enhancement**: Add CTAs to empty states guiding users to search

### Not a Bug
The empty states are working as designed. They appear when there's no data to display, which is expected for:
- New users who haven't searched yet
- Users who cleared their history
- Fresh database installations

---

## Quick Fix Implementation

If you want to add CTAs to empty states right now:

```typescript
// apps/web/src/components/dashboard/recent-searches-widget.tsx
import Link from 'next/link';

// In the empty state section:
<div className="flex min-h-[180px] flex-col items-center justify-center text-center">
  <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
  <p className="text-sm font-medium">No searches yet</p>
  <p className="text-xs text-muted-foreground mt-1 mb-4">
    Start exploring products to see your search history
  </p>
  <Button size="sm" variant="default" asChild>
    <Link href="/products">
      Browse Products
    </Link>
  </Button>
</div>
```

This transforms the empty state from passive to actionable! 🎯

---

**Document created:** June 10, 2024  
**Status:** Widgets working correctly, empty states are expected behavior  
**Action required:** Optional - add CTAs to empty states for better UX
