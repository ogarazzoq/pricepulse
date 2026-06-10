# Saved Products Feature

This feature implements the saved products (heart/save) functionality for the PricePulse platform.

## Files

- **saved-products.types.ts** - TypeScript type definitions
- **saved-products.api.ts** - API client functions for interacting with backend endpoints
- **use-saved-product.ts** - React Query hook for managing individual product saved state ✅ Task 10.1
- **use-saved-count.ts** - React Query hook for fetching saved products count
- **index.ts** - Feature exports

## React Query Hooks

### `useSavedProduct(productId)`

React Query hook for managing a single product's saved state with optimistic updates.

**Features:**
- Automatic saved state checking
- Optimistic save/unsave mutations
- Automatic rollback on failure with error toast (5 seconds)
- Invalidates related queries on success (`['saved']`, `['saved', 'count']`)
- Prevents race conditions with query cancellation

**Parameters:**
- `productId` (string): ID of the product to manage

**Returns:**
```typescript
{
  isSaved: boolean;        // Whether the product is currently saved
  save: () => void;        // Save the product (optimistic)
  unsave: () => void;      // Unsave the product (optimistic)
  isPending: boolean;      // Whether a mutation is in flight
}
```

**Usage Example:**
```tsx
import { useSavedProduct } from '@/features/saved-products';

function ProductCard({ productId }: { productId: string }) {
  const { isSaved, save, unsave, isPending } = useSavedProduct(productId);
  
  return (
    <button
      onClick={isSaved ? unsave : save}
      disabled={isPending}
      aria-pressed={isSaved}
    >
      {isSaved ? '❤️ Saved' : '🤍 Save'}
    </button>
  );
}
```

**Optimistic Update Flow:**
1. User clicks save/unsave
2. Hook immediately updates `['saved', productId]` and `['saved', 'count']` caches
3. API request is sent in background
4. On success: Invalidates `['saved']` list query to refetch
5. On error: Rolls back optimistic changes and shows toast notification

**Requirements Coverage:**
- ✅ Requirement 3.3: Optimistic updates within 100ms
- ✅ Requirement 3.4: Query key updates for saved, count, and list
- ✅ Requirement 3.5: Rollback and 5-second toast on failure

### `useSavedCount()`
Hook for fetching the current user's saved products count.
- **Returns:** `UseQueryResult<{ count: number }>`
- **Query Key:** `['saved', 'count']`
- **Auto-invalidates:** When save/unsave mutations occur

## API Client

The `savedProductsApi` object provides the following methods:

### `list(page?, pageSize?)`
List saved products with pagination.
- **Parameters:**
  - `page` (number, optional): Page number (default: 1)
  - `pageSize` (number, optional): Items per page (default: 20, max: 100)
- **Returns:** `Promise<SavedProductsListResponse>`

### `save(productId)`
Save a product (idempotent operation).
- **Parameters:**
  - `productId` (string): ID of the product to save
- **Returns:** `Promise<SavedProduct>`

### `unsave(productId)`
Unsave/remove a saved product.
- **Parameters:**
  - `productId` (string): ID of the product to unsave
- **Returns:** `Promise<void>`

### `check(productId)`
Check if a product is saved by the current user.
- **Parameters:**
  - `productId` (string): ID of the product to check
- **Returns:** `Promise<{ saved: boolean }>`

### `count()`
Get the total count of saved products for the current user.
- **Returns:** `Promise<{ count: number }>`

## Authentication

All API calls automatically include the JWT token from the auth store via axios interceptors configured in `@/lib/api-client`.

## Usage Example

```typescript
import { savedProductsApi, useSavedCount, useSavedProduct } from '@/features/saved-products';

// Using the API directly
// Save a product
const savedProduct = await savedProductsApi.save('product-123');

// Check if saved
const { saved } = await savedProductsApi.check('product-123');

// Get count
const { count } = await savedProductsApi.count();

// List saved products
const { items, total, page, pageSize } = await savedProductsApi.list(1, 20);

// Unsave a product
await savedProductsApi.unsave('product-123');

// Using React Query hooks
function SavedCountBadge() {
  const { data, isLoading, error } = useSavedCount();
  
  if (isLoading) return <Skeleton />;
  if (error) return null; // Silent failure
  
  const count = data?.count ?? 0;
  if (count === 0) return null;
  
  return <Badge>{count > 99 ? '99+' : count}</Badge>;
}

function HeartButton({ productId }: { productId: string }) {
  const { isSaved, save, unsave, isPending } = useSavedProduct(productId);
  
  return (
    <Button
      onClick={isSaved ? unsave : save}
      disabled={isPending}
      aria-pressed={isSaved}
      aria-label={isSaved ? 'Remove from saved' : 'Save product'}
    >
      <Heart className={isSaved ? 'fill-red-500' : ''} />
    </Button>
  );
}
```

## Related Tasks

- Task 9.1: Type definitions ✅
- Task 9.2: API client functions ✅
- Task 10.1: useSavedProduct hook ✅
- Task 10.2-10.3: Additional hooks (upcoming)
- Task 11: HeartButton component (upcoming)
- Task 12: Saved Products page (upcoming)

## Requirements Coverage

This implementation satisfies:
- Requirements 2.1-2.12: Saved Products API Surface
- Requirements 3.3-3.5: Heart Button mutation behavior
