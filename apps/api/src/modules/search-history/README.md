# Search History Module

## Overview

This module implements user search history functionality for the PricePulse platform. It captures, deduplicates, and manages user search queries with automatic normalization and per-user capping.

## Implementation Status: Task 3.1 ✅

**Task:** Create module structure and utilities

**Completed:**
- ✅ Created `search-history/` directory structure
- ✅ Implemented `normalizeQuery()` utility function
- ✅ Defined `CaptureSearchDto` with validation
- ✅ Defined `SearchHistoryDto` response type
- ✅ Created module, controller, and service skeleton files
- ✅ Added comprehensive unit tests for `normalizeQuery()`

## Module Structure

```
search-history/
├── dto/
│   ├── capture-search.dto.ts    # Request DTO for capturing searches
│   ├── search-history.dto.ts     # Response DTO for search history entries
│   └── index.ts                  # Barrel export
├── search-history.controller.ts  # REST API endpoints (placeholder for task 3.5)
├── search-history.service.ts     # Business logic (placeholder for task 3.3)
├── search-history.module.ts      # NestJS module definition
├── search-history.utils.ts       # Utility functions (normalizeQuery)
├── search-history.utils.spec.ts  # Unit tests for utilities
├── index.ts                      # Barrel export
└── README.md                     # This file
```

## Key Components

### 1. normalizeQuery() Utility

**Location:** `search-history.utils.ts`

**Purpose:** Normalizes search queries for deduplication and consistent storage.

**Transformations:**
- Trims leading/trailing whitespace
- Converts to lowercase
- Collapses multiple whitespace characters to single space

**Example:**
```typescript
normalizeQuery('  Wireless   HEADPHONES  ') // returns 'wireless headphones'
```

**Properties:**
- Idempotent: `normalize(normalize(s)) = normalize(s)`
- Consistent: Same normalized output for equivalent queries

### 2. CaptureSearchDto

**Location:** `dto/capture-search.dto.ts`

**Validation Rules:**
- Must be a non-empty string
- Minimum length: 2 characters
- Maximum length: 256 characters

**Swagger Documentation:** ✅ Included

### 3. SearchHistoryDto

**Location:** `dto/search-history.dto.ts`

**Fields:**
- `id`: Unique identifier (CUID)
- `userId`: Owner of the search
- `query`: Original query (preserves casing)
- `normalizedQuery`: Normalized version for deduplication
- `searchCount`: Number of times performed (min: 1)
- `lastSearchedAt`: Timestamp of most recent search
- `createdAt`: Timestamp of first search

**Swagger Documentation:** ✅ Included

### 4. SearchHistoryService

**Location:** `search-history.service.ts`

**Current Status:** Skeleton implementation with method signatures

**Planned Methods (Task 3.3):**
- `capture()`: Capture/update search with cap enforcement
- `list()`: Paginated list of searches
- `getRecent()`: Recent searches ordered by timestamp
- `getTop()`: Most frequent searches
- `remove()`: Delete single search entry
- `clearAll()`: Delete all user's searches

### 5. SearchHistoryController

**Location:** `search-history.controller.ts`

**Current Status:** Basic setup with JWT authentication

**Authentication:** All endpoints require JWT (via `JwtAuthGuard`)

**Planned Endpoints (Task 3.5):**
- `POST /api/v1/searches`: Capture a search
- `GET /api/v1/searches`: List searches (paginated)
- `GET /api/v1/searches/recent`: Recent searches
- `GET /api/v1/searches/top`: Top searches
- `DELETE /api/v1/searches/:id`: Delete single search
- `DELETE /api/v1/searches`: Clear all searches

**Swagger Tags:** `search-history`

### 6. SearchHistoryModule

**Location:** `search-history.module.ts`

**Configuration:**
- Controllers: `SearchHistoryController`
- Providers: `SearchHistoryService`
- Exports: `SearchHistoryService` (for use by other modules)

## Database Schema

The module uses the `SearchHistory` Prisma model:

```prisma
model SearchHistory {
  id              String   @id @default(cuid())
  userId          String
  query           String   @db.VarChar(256)
  normalizedQuery String   @db.VarChar(256)
  searchCount     Int      @default(1)
  lastSearchedAt  DateTime
  createdAt       DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, normalizedQuery])
  @@index([userId])
  @@index([userId, lastSearchedAt])
}
```

## Requirements Coverage

### Requirement 6.1 ✅
- Prisma model `SearchHistory` with all required fields (created in task 1.2)

### Requirement 6.3 ✅
- `normalizeQuery()` utility: lowercase, trim, collapse whitespace

### Requirement 6.11 ✅
- Input validation: string, length 2-256 characters

## Testing

### Unit Tests

**File:** `search-history.utils.spec.ts`

**Coverage:**
- ✅ Trim leading/trailing whitespace
- ✅ Convert to lowercase
- ✅ Collapse multiple whitespace
- ✅ Handle empty strings
- ✅ Handle whitespace-only strings
- ✅ Complex transformations
- ✅ Idempotence property

**Run Tests:**
```bash
# Tests will be added to test suite in task 22 (Property-based test setup)
```

## Next Steps

### Task 3.2: Write property tests for normalization
- Property 6: Normalization Idempotence
- Property 5: Normalization Deduplication

### Task 3.3: Implement SearchHistoryService
- Implement `capture()` with cap enforcement
- Implement pagination methods
- Implement delete operations

### Task 3.5: Implement SearchHistoryController
- Add REST endpoints
- Implement request/response handling
- Add Swagger documentation

### Task 3.7: Register module in AppModule
- Import `SearchHistoryModule`
- Verify Swagger documentation
- Test module loading

## Notes

- All imports use relative paths for consistency with existing codebase
- Module follows NestJS best practices and existing project patterns
- Comprehensive inline documentation for maintainability
- Ready for extension with service implementation
