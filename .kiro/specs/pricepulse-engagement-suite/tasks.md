# Implementation Plan: PricePulse Engagement Suite

## Overview

This implementation plan transforms the PricePulse platform into an engagement-driven product by adding saved products, search history, enhanced product details, improved price alerts, and robust email notifications. The implementation follows a clean architecture pattern with full TypeScript type safety, comprehensive property-based testing, and production-ready error handling.

**Tech Stack:**
- Backend: NestJS + Prisma + PostgreSQL + Redis + BullMQ
- Frontend: Next.js 15 (App Router) + React Query v5 + Zustand + Radix UI
- Testing: Jest + fast-check (property-based testing)
- Deployment: Railway (API) + Vercel (Web)

**Key Principles:**
- All changes are additive (preserve existing functionality)
- Use existing `Alert` model (no parallel models)
- Maintain existing BullMQ queues
- Follow WCAG 2.1 AA accessibility standards
- Sub-200ms p95 latency for CRUD operations

---

## Tasks

- [x] 1. Database schema and migrations
  - [x] 1.1 Create SavedProduct model and migration
    - Add Prisma model `SavedProduct` with fields: `id` (cuid), `userId` (FK cascade), `productId` (FK cascade), `createdAt`
    - Add composite unique constraint on `(userId, productId)`
    - Add non-unique index on `userId`
    - Generate and test migration file
    - _Requirements: 1.1, 1.2, 1.7_

  - [x] 1.2 Create SearchHistory model and migration
    - Add Prisma model `SearchHistory` with fields: `id` (cuid), `userId` (FK cascade), `query` (string 256), `normalizedQuery` (string 256), `searchCount` (int default 1), `lastSearchedAt`, `createdAt`
    - Add unique constraint on `(userId, normalizedQuery)`
    - Add non-unique indexes on `userId` and `(userId, lastSearchedAt)`
    - Generate and test migration file
    - _Requirements: 6.1, 6.2, 6.9_

  - [ ]* 1.3 Write property test for cascade delete behavior
    - **Property 4: Referential Integrity**
    - **Validates: Requirements 1.8, 1.9**
    - Test that deleting a User cascades to all SavedProduct rows
    - Test that deleting a Product cascades to all SavedProduct rows
    - Use fast-check to generate multiple users/products scenarios

- [ ] 2. Backend: Saved Products module
  - [x] 2.1 Create module structure and DTOs
    - Create `saved-products/` directory with module, controller, service files
    - Define `CreateSavedProductDto` with validation (IsString, IsNotEmpty)
    - Define `SavedProductDto` response type with joined product fields
    - Define `PaginatedSavedProductsDto` for list responses
    - _Requirements: 1.1, 2.1, 2.12_

  - [x] 2.2 Implement SavedProductsService
    - Implement `create()` with upsert logic (idempotent)
    - Implement `list()` with pagination, ordered by createdAt desc, with product join
    - Implement `remove()` as no-op delete (204 even if not found)
    - Implement `count()` returning total saved count
    - Implement `check()` returning boolean saved status
    - All methods filter strictly by userId (IDOR prevention)
    - _Requirements: 1.3, 1.4, 2.11_

  - [ ]* 2.3 Write property tests for SavedProductsService
    - **Property 1: Idempotence**
    - **Validates: Requirements 1.4, 2.5**
    - Test that saving twice creates exactly one row with unchanged createdAt
    - **Property 2: Input Validation**
    - **Validates: Requirements 1.5, 1.6**
    - Test rejection of invalid inputs (missing, empty, non-existent productId)
    - **Property 3: Consistency**
    - **Validates: Requirements 2.6, 2.8, 2.9**
    - Test count and check consistency across save/unsave sequences

  - [ ] 2.4 Implement SavedProductsController
    - Implement `GET /api/v1/saved` with pagination (default page=1, pageSize=20, clamp pageSize≤100)
    - Implement `POST /api/v1/saved` returning 201 (new) or 200 (existing)
    - Implement `DELETE /api/v1/saved/:productId` returning 204
    - Implement `GET /api/v1/saved/count` returning { count: number }
    - Implement `GET /api/v1/saved/check/:productId` returning { saved: boolean }
    - Apply JWT guard to all endpoints
    - Extract userId from @CurrentUser decorator
    - _Requirements: 2.1-2.12_

  - [ ]* 2.5 Write unit tests for SavedProductsController
    - Test pagination parameter clamping and defaults
    - Test JWT guard enforcement (401 without token)
    - Test IDOR prevention (user A cannot access user B's saves)
    - Test error responses (404 for non-existent product)

  - [ ] 2.6 Register SavedProductsModule in AppModule
    - Import SavedProductsModule in app.module.ts
    - Verify Swagger documentation generation
    - Verify module loads without errors

- [ ] 3. Backend: Search History module
  - [x] 3.1 Create module structure and utilities
    - Create `search-history/` directory with module, controller, service files
    - Implement `normalizeQuery()` utility (trim, lowercase, collapse whitespace)
    - Define `CaptureSearchDto` with validation (string, length 2-256)
    - Define `SearchHistoryDto` response type
    - _Requirements: 6.1, 6.3, 6.11_

  - [ ]* 3.2 Write property tests for normalization
    - **Property 6: Normalization Idempotence**
    - **Validates: Requirement 6.3**
    - Test that normalize(normalize(s)) = normalize(s)
    - **Property 5: Normalization Deduplication**
    - **Validates: Requirements 6.3, 6.6, 6.7**
    - Test that normalize(q1) = normalize(q2) results in one row with searchCount=2

  - [ ] 3.3 Implement SearchHistoryService with cap enforcement
    - Implement `capture()` with transactional upsert and cap logic
    - Per-user cap: read from env SEARCH_HISTORY_MAX_PER_USER (default 100, clamped 10-1000)
    - Evict oldest entry (by lastSearchedAt, then id) when at cap before insert
    - Implement `list()` with pagination ordered by lastSearchedAt desc
    - Implement `getRecent()` with limit (default 10, clamped 1-50)
    - Implement `getTop()` ordered by searchCount desc, lastSearchedAt desc
    - Implement `remove()` and `clearAll()` with userId filtering
    - _Requirements: 6.6, 6.7, 7.1, 7.2, 7.3, 7.5, 8.7, 8.8_

  - [ ]* 3.4 Write property tests for SearchHistoryService
    - **Property 4: Cap Invariant**
    - **Validates: Requirement 7.1**
    - Test that count(SearchHistory WHERE userId=u) ≤ cap after every POST
    - Test eviction behavior (oldest entry removed when at cap)
    - **Property 18: Pagination Bounds**
    - **Validates: Requirements 2.3, 21.1, 21.2**
    - Test response length ≤ min(pageSize, cap)

  - [ ] 3.5 Implement SearchHistoryController
    - Implement `POST /api/v1/searches` calling capture()
    - Implement `GET /api/v1/searches` with pagination
    - Implement `GET /api/v1/searches/recent?limit=N`
    - Implement `GET /api/v1/searches/top?limit=N`
    - Implement `DELETE /api/v1/searches/:id` returning 204 or 404
    - Implement `DELETE /api/v1/searches` (clear all) returning 204
    - Apply JWT guard, extract userId from @CurrentUser
    - Validate limit parameters (respond 400 for non-integer)
    - _Requirements: 8.1-8.10_

  - [ ]* 3.6 Write unit tests for SearchHistoryController
    - Test limit clamping for recent/top endpoints
    - Test JWT guard enforcement
    - Test IDOR prevention (404 when deleting another user's entry)
    - Test clear-all operation safety

  - [ ] 3.7 Register SearchHistoryModule in AppModule
    - Import SearchHistoryModule in app.module.ts
    - Verify Swagger documentation generation
    - Verify module loads without errors

- [ ] 4. Backend: Extend Alerts module
  - [x] 4.1 Extend AlertsService for status transitions
    - Modify `update()` to accept optional `status` field (ACTIVE/PAUSED)
    - Implement status validation (only ACTIVE/PAUSED allowed in updates)
    - Preserve `triggeredCount` and `lastTriggeredAt` during status changes
    - Implement `archive()` method setting status=ARCHIVED (soft delete)
    - Ensure all operations filter by userId AND id (IDOR prevention)
    - _Requirements: 13.3, 13.5, 13.6, 13.7, 13.8_

  - [ ]* 4.2 Write property tests for AlertsService
    - **Property 10: IDOR Prevention**
    - **Validates: Requirement 13.8**
    - Test that PATCH/DELETE on another user's alert returns 404 with no mutation
    - **Property 11: Status Transition Preservation**
    - **Validates: Requirement 13.6**
    - Test that status-only PATCH preserves triggeredCount and lastTriggeredAt

  - [x] 4.3 Update UpdateAlertDto to support status field
    - Add optional `status` field with enum validation (ACTIVE/PAUSED only)
    - Add validation for threshold (0.01-999,999,999.99, max 2 decimals)
    - Add validation for condition (AlertCondition enum)
    - Add validation for channels (array, min 1, unique)
    - _Requirements: 13.3, 13.4_

  - [ ] 4.4 Update AlertsController for new operations
    - Ensure PATCH endpoint accepts partial updates including status
    - Ensure DELETE endpoint calls archive() instead of physical delete
    - Return 404 for PATCH/DELETE on non-owned or ARCHIVED alerts
    - _Requirements: 13.2, 13.7, 13.9_

  - [ ]* 4.5 Write integration tests for alert lifecycle
    - Test create → pause → activate → archive flow
    - Test that alert-evaluate worker skips PAUSED and ARCHIVED alerts
    - Test IDOR scenarios

- [ ] 5. Backend: Extend Notifications module
  - [x] 5.1 Define NotificationMetadata TypeScript interface
    - Define interface with email-specific fields: offerId, marketplaceSlug, oldPrice, newPrice, threshold, condition, priceBucketHash
    - Add status tracking fields: retryCount, deduped, dryRun
    - _Requirements: Design document_

  - [x] 5.2 Implement price bucket hash computation utility
    - Create `computePriceBucketHash()` function
    - Hash payload: alertId:offerId:condition:threshold:priceRounded
    - Use crypto.createHash('sha256').digest('hex').substring(0, 16)
    - _Requirements: 16.2, 16.3_

  - [ ] 5.3 Extend NotificationsService with dedup guard
    - Implement `isDuplicate()` method checking for existing notification within cooldown window
    - Query by userId, priceBucketHash (JSON path), createdAt >= cutoff
    - Use 2-second query timeout
    - Read cooldown hours from env ALERT_EMAIL_COOLDOWN_HOURS (default 24, clamped 1-168)
    - Implement `incrementRetry()` method updating retryCount in metadata
    - _Requirements: 16.3, 16.4, 16.7_

  - [ ]* 5.4 Write property tests for dedup logic
    - **Property 12: Email Dedup Window**
    - **Validates: Requirements 16.3, 16.4**
    - Test that two equal-hash evaluations within cooldown produce at most one email
    - **Property 13: Dedup Independence**
    - **Validates: Requirement 16.8**
    - Test that distinct hashes produce distinct emails within window

- [ ] 6. Backend: BullMQ notification-dispatch worker extensions
  - [ ] 6.1 Update notification-dispatch worker configuration
    - Set attempts: 5
    - Set exponential backoff (5s, 10s, 20s, 40s, 80s)
    - Set removeOnComplete age: 24 hours
    - Set removeOnFail age: 7 days
    - _Requirements: 15.6, 17.4_

  - [ ] 6.2 Implement dedup guard in worker handle() method
    - Fetch notification with user and alert joins
    - Extract priceBucketHash from metadata
    - Call isDuplicate() before sending email
    - If duplicate, mark notification SENT with deduped=true, skip email
    - _Requirements: 16.3, 16.4_

  - [ ] 6.3 Implement email sending logic
    - Extract product, user, alert data from notification
    - Build productUrl from APP_URL and product slug
    - Render email with template 'price-drop' and context data
    - Call MailerService.sendMail()
    - _Requirements: 18.1, 18.4, 18.5_

  - [ ] 6.4 Implement success/failure status updates
    - On success: update notification status to SENT, set sentAt, save retryCount
    - On failure: update status to FAILED (if attempt 5) or keep PENDING
    - Save failedAt timestamp on final failure
    - Log errorMessage (truncate to 1000 chars)
    - Create JobLog entry for each attempt
    - _Requirements: 15.6, 17.5, 17.6_

  - [ ]* 6.5 Write property tests for worker behavior
    - **Property 14: Retry Confluence**
    - **Validates: Requirements 15.6, 17.5**
    - Test that job failing 5 times ends FAILED with retryCount=5
    - **Property 15: Mailer Dry-Run Safety**
    - **Validates: Requirements 15.8, 23.1**
    - Test that dry-run never throws and ends SENT with dryRun=true

- [ ] 7. Backend: Email templates
  - [ ] 7.1 Create price-drop email HTML template
    - Create Handlebars template at `apps/api/views/emails/price-drop.hbs`
    - Include product title, image, old/new price, savings, savings percent
    - Include marketplace name and product URL (clickable)
    - Use responsive email design (mobile-friendly)
    - _Requirements: 18.1, 18.4, 18.6_

  - [ ] 7.2 Create price-drop email text template
    - Create plain text version at `apps/api/views/emails/price-drop.txt`
    - Include all data from HTML version in readable format
    - Include clickable URL
    - _Requirements: 18.5, 18.7_

  - [ ]* 7.3 Write integration tests for email rendering
    - **Property 16: Email Subject Contract**
    - **Validates: Requirement 18.1**
    - Test subject matches "^Price Drop Alert: .+$" and contains product title
    - **Property 17: Email URL Round-Trip**
    - **Validates: Requirements 18.4, 18.5**
    - Test HTML and text bodies contain correct product URL

- [ ] 8. Checkpoint - Backend core functionality complete
  - Ensure all migrations apply successfully
  - Ensure all new endpoints return expected responses
  - Ensure all tests pass
  - Ask the user if questions arise

- [x] 9. Frontend: Type definitions and API client
  - [x] 9.1 Create TypeScript type definitions
    - Create `types/saved-product.ts` with SavedProduct, SavedProductDto interfaces
    - Create `types/search-history.ts` with SearchHistory, SearchHistoryDto interfaces
    - Update `types/alert.ts` to include status field (ACTIVE/PAUSED)
    - Create `types/pagination.ts` with PaginatedResponse generic
    - _Requirements: 2.12, Design document_

  - [x] 9.2 Implement saved-products API client functions
    - Create `lib/api/saved-products.ts` with axios client
    - Implement `getSavedProducts(page, pageSize)` → PaginatedResponse
    - Implement `saveProduct(productId)` → SavedProductDto
    - Implement `unsaveProduct(productId)` → void
    - Implement `checkSavedProduct(productId)` → { saved: boolean }
    - Implement `getSavedCount()` → { count: number }
    - All functions use JWT token from auth store
    - _Requirements: 2.1-2.12_

  - [x] 9.3 Implement search-history API client functions
    - Create `lib/api/search-history.ts` with axios client
    - Implement `captureSearch(query)` → SearchHistoryDto
    - Implement `getSearches(page, pageSize)` → PaginatedResponse
    - Implement `getRecentSearches(limit)` → SearchHistoryDto[]
    - Implement `getTopSearches(limit)` → SearchHistoryDto[]
    - Implement `deleteSearch(id)` → void
    - Implement `clearAllSearches()` → void
    - All functions use JWT token from auth store
    - _Requirements: 8.1-8.10_

- [ ] 10. Frontend: React Query hooks
  - [ ] 10.1 Implement useSavedProduct hook
    - Create `lib/hooks/use-saved-products.ts`
    - Implement check query with key ['saved', productId]
    - Implement save mutation with optimistic updates
    - Implement unsave mutation with optimistic updates
    - On mutation error, rollback optimistic changes and show toast
    - Return { isSaved, save, unsave, isPending }
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ] 10.2 Implement useSavedProducts list hook
    - Implement query with key ['saved', { page, pageSize }]
    - Call getSavedProducts API function
    - Return paginated response
    - _Requirements: 4.2_

  - [ ] 10.3 Implement useSavedCount hook
    - Implement query with key ['saved', 'count']
    - Call getSavedCount API function
    - Auto-invalidate on save/unsave mutations
    - _Requirements: 5.2_

  - [ ] 10.4 Implement useSearchCapture hook with coalescing
    - Create `lib/hooks/use-search-history.ts`
    - Implement coalescing logic: track last submit time per normalized query
    - Only submit to API once per 5 seconds per normalized query
    - Return { capture } function
    - Silent failure (no error toast)
    - _Requirements: 6.4, 6.5, 6.8_

  - [ ] 10.5 Implement useSearches hooks
    - Implement useSearches(page, pageSize) for paginated list
    - Implement useRecentSearches(limit) for recent widget
    - Implement useTopSearches(limit) for top widget
    - Implement useDeleteSearch mutation with optimistic removal
    - Implement useClearSearches mutation with confirmation
    - _Requirements: 9.2, 9.6, 9.7_

- [ ] 11. Frontend: HeartButton component
  - [ ] 11.1 Create HeartButton component
    - Create `components/products/heart-button.tsx`
    - Use Radix Button primitive with icon variant
    - Render Heart icon from lucide-react
    - Implement filled/outlined states (filled red when saved, outlined gray when not)
    - Use useSavedProduct(productId) hook
    - Handle toggle on click (save if unsaved, unsave if saved)
    - _Requirements: 3.1, 3.2_

  - [ ] 11.2 Add accessibility features to HeartButton
    - Set aria-pressed to reflect saved state
    - Set aria-label: "Save <title>" or "Remove <title> from saved"
    - Provide title attribute for tooltip
    - Ensure 44x44px minimum touch target (size variants: sm/md/lg)
    - Disable when not authenticated with label "Sign in to save products"
    - Disable while mutation in flight
    - _Requirements: 3.6, 3.7, 3.8_

  - [ ]* 11.3 Write component tests for HeartButton
    - Test toggle behavior (save/unsave)
    - Test optimistic updates and error rollback
    - Test accessibility attributes
    - Test disabled states (unauthenticated, in-flight)

- [ ] 12. Frontend: Saved Products page
  - [ ] 12.1 Create /saved page route
    - Create `app/(dashboard)/saved/page.tsx`
    - Fetch saved products using useSavedProducts hook
    - Implement responsive grid layout (1/2/3/4 columns based on viewport)
    - Render product cards with HeartButton in saved state
    - _Requirements: 4.1, 4.3_

  - [ ] 12.2 Add pagination to saved page
    - Render pagination controls (previous/next, page indicator)
    - Disable previous on page 1, next on last page
    - Update URL search params on page change
    - _Requirements: 4.5_

  - [ ] 12.3 Add empty and loading states
    - Render skeleton placeholders during initial load
    - Render EmptyState component when no saved products
    - Include CTA linking to /products in empty state
    - Handle fetch errors with retry control
    - _Requirements: 4.4, 4.9, 4.10_

  - [ ] 12.4 Handle unsave from saved page
    - Implement optimistic removal from grid on unsave
    - If page becomes empty and previous page exists, navigate to previous page
    - Show toast on error and restore removed card
    - _Requirements: 4.8_

  - [ ]* 12.5 Write E2E tests for saved page
    - Test save/unsave flow from product cards
    - Test pagination navigation
    - Test empty state display
    - Test responsive layout at multiple viewports

- [ ] 13. Frontend: Sidebar badge
  - [ ] 13.1 Add SavedCountBadge to sidebar
    - Update `components/layout/sidebar.tsx`
    - Use useSavedCount hook
    - Render badge next to "Saved" entry
    - Display count (show "99+" if count > 99)
    - Show skeleton during initial load
    - _Requirements: 5.1, 5.2, 5.6, 5.7_

  - [ ] 13.2 Add accessibility for badge
    - Use aria-live="polite" for count updates
    - Render nothing when count is 0 (but keep "Saved" entry visible)
    - Silent failure if fetch fails (preserve cached count)
    - _Requirements: 5.4, 5.5, 5.8_

- [ ] 14. Frontend: Search widgets
  - [ ] 14.1 Create RecentSearchesWidget component
    - Create `components/search/recent-searches-widget.tsx`
    - Use useRecentSearches(5) hook
    - Render list of recent searches ordered by lastSearchedAt
    - On click, navigate to `/products?q=<encoded query>`
    - Show "No searches yet" empty state at stable height
    - Show skeleton during load
    - _Requirements: 9.6, 9.8, 9.9, 9.10_

  - [ ] 14.2 Create TopSearchesWidget component
    - Create `components/search/top-searches-widget.tsx`
    - Use useTopSearches(5) hook
    - Render list with searchCount badge
    - On click, navigate to `/products?q=<encoded query>`
    - Show "No searches yet" empty state at stable height
    - Show skeleton during load
    - _Requirements: 9.7, 9.8, 9.9, 9.10_

  - [ ] 14.3 Add widgets to dashboard
    - Import widgets in `app/(dashboard)/dashboard/page.tsx`
    - Position in dashboard grid layout
    - Ensure responsive at 320, 375, 768, 1024, 1440+ px
    - _Requirements: 9.9_

- [ ] 15. Frontend: Searches page
  - [ ] 15.1 Create /searches page route
    - Create `app/(dashboard)/searches/page.tsx`
    - Use useSearches hook with pagination
    - Render table/list with query, lastSearchedAt, searchCount columns
    - Make each row clickable to navigate to search results
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 15.2 Add per-row delete action
    - Add delete icon button to each row
    - Call useDeleteSearch mutation
    - Optimistically remove row from list
    - Show toast and restore on error
    - _Requirements: 9.5_

  - [ ] 15.3 Add clear-all action
    - Add "Clear all" button
    - Show confirmation dialog on click
    - Call useClearSearches mutation on confirm
    - Show toast on success
    - _Requirements: 9.4_

  - [ ]* 15.4 Write E2E tests for searches page
    - Test search capture flow
    - Test delete and clear-all operations
    - Test navigation to search results
    - Test pagination

- [ ] 16. Frontend: Product detail pages
  - [ ] 16.1 Create /products/[slug] canonical route
    - Create `app/(dashboard)/products/[slug]/page.tsx`
    - Fetch product data server-side via API with 10-second timeout
    - Return notFound() on 404 response
    - Render error boundary on non-404 failures
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ] 16.2 Update /products/[id] legacy route to redirect
    - Update `app/(dashboard)/products/[id]/page.tsx`
    - Fetch product to resolve slug
    - Issue 308 redirect to /products/[slug]
    - Return notFound() if product doesn't exist
    - _Requirements: 10.5, 10.6_

  - [ ] 16.3 Implement slug page metadata
    - Export generateMetadata function
    - Fetch product server-side (5-second timeout)
    - Set title: "<product title> — PricePulse" (cap at 70 chars)
    - Set description: truncate product description to 160 chars, fallback to "Compare prices across marketplaces"
    - Set OpenGraph with type, url, siteName, images (product imageUrl or default)
    - Set Twitter card with summary_large_image
    - Return safe defaults on 404 or fetch failure
    - _Requirements: 12.1-12.8_

  - [ ] 16.4 Build slug page hero section
    - Render product image with 5-second timeout, fallback to placeholder
    - Render title (h1), description, brand, category
    - Render rating summary (average 0.0-5.0, review count)
    - Render HeartButton component
    - Add canonical link tag to head
    - _Requirements: 11.1, 11.2, 10.7_

  - [ ] 16.5 Build slug page price stats section
    - Render lowest/highest/average prices with currency formatting
    - Render "Available on N marketplaces" stat
    - Handle null prices gracefully
    - _Requirements: 11.3, 11.4_

  - [ ] 16.6 Integrate OfferComparison component
    - Render existing OfferComparison component when offers exist
    - Highlight cheapest priced offer
    - Show empty-offers state when no offers
    - _Requirements: 11.5, 11.6_

  - [ ] 16.7 Add price distribution chart
    - Render Recharts component when ≥2 priced offers exist
    - Map offer price to marketplace
    - Skip chart when <2 offers
    - _Requirements: 11.7_

  - [ ] 16.8 Ensure slug page accessibility
    - Use exactly one h1 (product title)
    - Use h2 for section headings
    - No heading level skipping
    - Responsive layout at 320, 375, 768, 1024, 1440+ px
    - No horizontal scrolling
    - _Requirements: 11.10, 11.11_

  - [ ] 16.9 Handle anonymous viewers
    - Disable HeartButton with "Sign in" message
    - Disable alert quick-create with sign-in affordance
    - _Requirements: 11.9_

  - [ ]* 16.10 Write E2E tests for product pages
    - Test slug route rendering
    - Test id-to-slug redirect (308)
    - Test 404 handling
    - Test metadata generation
    - Test anonymous vs authenticated views

- [ ] 17. Frontend: Price alert quick-create
  - [ ] 17.1 Create PriceAlertQuickCreate component
    - Create `components/products/price-alert-quick-create.tsx`
    - Pre-fill threshold to lowestPrice * 0.9 rounded to 2 decimals
    - Accept input range 0.01-999,999,999.99 with max 2 decimals
    - Use inputmode="decimal" for mobile keyboards
    - Associate input with visible label or aria-label
    - _Requirements: 14.1, 14.8_

  - [ ] 17.2 Implement validation and submission
    - Validate on submit: non-empty, numeric, 0.01-999,999,999.99, max 2 decimals
    - Show inline validation error and retain value on invalid
    - POST to /api/v1/alerts with { productId, condition: "BELOW", threshold, channels: ["EMAIL"] }
    - Show confirming toast on success (auto-dismiss 5s)
    - Invalidate ['alerts'] query
    - Show error toast on failure, preserve value for retry
    - _Requirements: 14.4, 14.5, 14.7_

  - [ ] 17.3 Handle disabled state
    - Disable when lowestPrice is null
    - Show tooltip "No priced offer yet" on hover/focus
    - Disable for anonymous viewers with sign-in affordance
    - _Requirements: 14.2_

  - [ ] 17.4 Add to product pages
    - Render component on slug page
    - Render component on saved page cards (when lowestPrice exists)
    - _Requirements: 11.8, 14.3_

  - [ ]* 17.5 Write component tests for quick-create
    - Test validation (edge cases: 0, negative, too many decimals)
    - Test successful submission
    - Test error handling
    - Test disabled states

- [ ] 18. Frontend: Alerts management page enhancements
  - [ ] 18.1 Update /alerts page with new controls
    - Update `app/(dashboard)/alerts/page.tsx`
    - Add edit controls for threshold/condition
    - Add toggle for ACTIVE↔PAUSED status
    - Add archive button (soft delete)
    - Refresh view within 2000ms of mutation success
    - _Requirements: 13.10_

  - [ ]* 18.2 Write E2E tests for alerts page
    - Test create → edit → pause → activate → archive flow
    - Test validation errors
    - Test IDOR prevention

- [ ] 19. Checkpoint - Frontend core functionality complete
  - Ensure all pages render correctly
  - Ensure all mutations work with optimistic updates
  - Ensure accessibility features work (keyboard nav, screen readers)
  - Ensure responsive design at all breakpoints
  - Ask the user if questions arise

- [ ] 20. Integration: Search capture integration
  - [ ] 20.1 Integrate search capture in product search page
    - Update search submission handler in `/products` page
    - Call useSearchCapture().capture(query) on search submit
    - Ensure coalescing (5-second window)
    - Only capture queries with trimmed length 2-256
    - _Requirements: 6.4, 6.5_

  - [ ]* 20.2 Write property test for search coalescing
    - **Property 20: Search Coalescing Is Lossless**
    - **Validates: Requirement 6.8**
    - Test that identical submissions in 5s window increase server searchCount by exactly one

- [ ] 21. Integration: HeartButton integration
  - [ ] 21.1 Add HeartButton to product catalog cards
    - Update product card component
    - Add HeartButton with size="sm"
    - Ensure 44x44px touch target
    - _Requirements: 3.1_

  - [ ] 21.2 Add HeartButton to slug page
    - Add HeartButton to hero section
    - Use size="md"
    - _Requirements: 11.8_

  - [ ] 21.3 Add HeartButton to saved page cards
    - Render in saved state by default
    - _Requirements: 4.7_

- [ ] 22. Testing: Property-based test setup
  - [ ] 22.1 Set up fast-check in backend tests
    - Install fast-check: `npm install --save-dev fast-check @types/fast-check`
    - Configure Jest for property tests
    - Create test helpers for generating test data (users, products)
    - _Requirements: PBT scope_

  - [ ] 22.2 Create property test utilities
    - Create arbitraries for User, Product, SavedProduct, SearchHistory
    - Create test database helpers (setup/teardown)
    - Create fast-check matchers for common assertions
    - _Requirements: Design document Correctness Properties_

  - [ ]* 22.3 Run all property tests
    - Execute all property tests marked with * in previous tasks
    - Verify 100 runs per property pass
    - Fix any failing properties
    - Generate coverage report

- [ ] 23. Testing: Integration tests
  - [ ]* 23.1 Write integration test for full save flow
    - Test: User clicks heart → POST /saved → badge updates → saved page shows product
    - Use Playwright or similar E2E framework
    - _Requirements: Requirements 1-5_

  - [ ]* 23.2 Write integration test for search history flow
    - Test: User searches → POST /searches → widget shows search → click navigates to results
    - _Requirements: Requirements 6-9_

  - [ ]* 23.3 Write integration test for alert creation flow
    - Test: User on slug page → fills quick-create → POST /alerts → worker evaluates → email sent
    - Mock SMTP to verify email content
    - _Requirements: Requirements 13-18_

  - [ ]* 23.4 Write integration test for email deduplication
    - Test: Trigger two alerts within cooldown → verify only one email sent
    - Test: Trigger alerts with different buckets → verify both sent
    - _Requirements: Requirements 16.3, 16.4, 16.8_

  - [ ]* 23.5 Write integration test for worker retry logic
    - Mock mailer to fail 4 times, succeed on 5th
    - Verify notification status transitions correctly
    - Verify retryCount in metadata
    - _Requirements: Requirements 15.6, 17.5_

- [ ] 24. Testing: Accessibility audit
  - [ ]* 24.1 Run automated accessibility tests
    - Use axe-core or similar tool
    - Test all new pages and components
    - Fix any WCAG 2.1 AA violations
    - _Requirements: Design goals_

  - [ ]* 24.2 Manual keyboard navigation testing
    - Test all interactive elements reachable via Tab
    - Test form submission via Enter
    - Test dialog closure via Escape
    - _Requirements: Design goals_

  - [ ]* 24.3 Manual screen reader testing
    - Test with NVDA or JAWS
    - Verify all buttons have proper labels
    - Verify live regions announce updates
    - _Requirements: Design goals_

- [ ] 25. Documentation and deployment
  - [ ] 25.1 Update API documentation
    - Add Swagger annotations for all new endpoints
    - Document request/response schemas
    - Document authentication requirements
    - Document error codes
    - _Requirements: Design document_

  - [ ] 25.2 Update frontend documentation
    - Document new pages and routes
    - Document new components and hooks
    - Document prop interfaces
    - Add usage examples
    - _Requirements: Design document_

  - [ ] 25.3 Create environment variable documentation
    - Document SEARCH_HISTORY_MAX_PER_USER (default 100, range 10-1000)
    - Document ALERT_EMAIL_COOLDOWN_HOURS (default 24, range 1-168)
    - Document APP_URL and NEXT_PUBLIC_APP_URL requirements
    - Document SMTP configuration for production
    - _Requirements: Requirements 7.3, 16.7_

  - [ ] 25.4 Update deployment configuration
    - Add new env vars to Railway configuration
    - Add new env vars to Vercel configuration
    - Verify Redis connection for BullMQ
    - Verify PostgreSQL connection for Prisma
    - _Requirements: Design constraints_

  - [ ] 25.5 Run database migrations in production
    - Apply SavedProduct migration to production database
    - Apply SearchHistory migration to production database
    - Verify migrations completed successfully
    - Verify indexes created
    - _Requirements: Requirements 1.7, 6.9_

  - [ ] 25.6 Deploy backend to Railway
    - Push backend changes to Railway
    - Verify all new endpoints accessible
    - Verify worker processes running
    - Monitor error logs
    - _Requirements: Design constraints_

  - [ ] 25.7 Deploy frontend to Vercel
    - Push frontend changes to Vercel
    - Verify all new pages accessible
    - Verify API calls work
    - Test responsive design on real devices
    - _Requirements: Design constraints_

- [ ] 26. Final checkpoint and user acceptance
  - Verify all acceptance criteria met for Requirements 1-18
  - Verify all property tests pass
  - Verify no regression in existing functionality
  - Perform smoke tests on production environment
  - Ask the user if questions arise

---

## Notes

### Task Marking Convention

- Tasks marked with `*` (e.g., `- [ ]* 2.3`) are **optional test tasks** that can be skipped for faster MVP delivery
- Optional tasks include:
  - Property-based tests (fast-check)
  - Integration tests
  - E2E tests
  - Accessibility audits
- Core implementation tasks (without `*`) must be completed for production readiness

### Testing Strategy

**Property-Based Testing (PBT):**
- Uses fast-check library for generative testing
- Each property test runs 100 iterations with random inputs
- Properties validate universal correctness guarantees from the design document
- Properties are mapped to specific requirements for traceability

**Integration Testing:**
- Tests full user flows end-to-end
- Uses mocked external services (SMTP, etc.)
- Validates interactions between frontend, backend, database, and workers

**Unit Testing:**
- Tests individual functions and components in isolation
- Validates edge cases and error handling
- Uses Jest for both backend and frontend

### Dependency Management

**Database:**
- Migrations must be applied before running any backend services
- Tasks 1.1 and 1.2 are prerequisites for all backend implementation tasks

**Backend:**
- Modules can be developed in parallel (saved-products, search-history, alerts, notifications)
- Worker extensions depend on notifications module extensions

**Frontend:**
- API client functions (task 9) must be complete before hooks (task 10)
- Hooks must be complete before components (tasks 11-18)
- Components can be developed in parallel after hooks are ready

### Environment Configuration

**Required for Production:**
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string for BullMQ
- `APP_URL` — Full web app URL for email links
- `NEXT_PUBLIC_APP_URL` — Same as APP_URL for frontend
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — Email delivery

**Optional:**
- `SEARCH_HISTORY_MAX_PER_USER` — Cap per user (default 100)
- `ALERT_EMAIL_COOLDOWN_HOURS` — Dedup window (default 24)

### Performance Targets

- CRUD operations: sub-200ms p95 latency
- Saved products list: paginate to avoid large payloads
- Search history: cap prevents unbounded growth
- Email deduplication: prevents spam within cooldown window

### Accessibility Compliance

All UI components must meet WCAG 2.1 AA standards:
- Keyboard navigable (Tab, Enter, Escape)
- Screen reader accessible (aria-labels, aria-live)
- Sufficient color contrast (3:1 minimum)
- Touch targets ≥44x44px
- Responsive design (320px-1440px+)

### Incremental Validation

Checkpoint tasks (8, 19, 26) are included at strategic points to:
- Validate that all migrations work
- Verify that all tests pass
- Ensure no regressions in existing functionality
- Allow user to provide feedback before continuing


---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2"]
    },
    {
      "id": 1,
      "tasks": ["1.3", "2.1", "3.1", "4.1", "5.1", "9.1"]
    },
    {
      "id": 2,
      "tasks": ["2.2", "3.2", "4.3", "5.2", "9.2", "9.3"]
    },
    {
      "id": 3,
      "tasks": ["2.3", "2.4", "3.3", "4.2", "5.3", "7.1", "7.2", "10.1", "10.2", "10.3"]
    },
    {
      "id": 4,
      "tasks": ["2.5", "2.6", "3.4", "3.5", "4.4", "5.4", "6.1", "7.3", "10.4", "10.5"]
    },
    {
      "id": 5,
      "tasks": ["3.6", "3.7", "4.5", "6.2", "11.1"]
    },
    {
      "id": 6,
      "tasks": ["6.3", "6.4", "11.2", "14.1"]
    },
    {
      "id": 7,
      "tasks": ["6.5", "11.3", "12.1", "13.1", "14.2", "16.1"]
    },
    {
      "id": 8,
      "tasks": ["12.2", "12.3", "13.2", "14.3", "16.2", "16.3", "17.1"]
    },
    {
      "id": 9,
      "tasks": ["12.4", "15.1", "16.4", "16.5", "17.2"]
    },
    {
      "id": 10,
      "tasks": ["12.5", "15.2", "15.3", "16.6", "16.7", "17.3"]
    },
    {
      "id": 11,
      "tasks": ["15.4", "16.8", "16.9", "17.4", "18.1"]
    },
    {
      "id": 12,
      "tasks": ["16.10", "17.5", "18.2", "20.1", "21.1", "21.2", "21.3"]
    },
    {
      "id": 13,
      "tasks": ["20.2", "22.1", "22.2"]
    },
    {
      "id": 14,
      "tasks": ["22.3", "23.1", "23.2", "23.3"]
    },
    {
      "id": 15,
      "tasks": ["23.4", "23.5", "24.1", "24.2", "24.3"]
    },
    {
      "id": 16,
      "tasks": ["25.1", "25.2", "25.3", "25.4"]
    },
    {
      "id": 17,
      "tasks": ["25.5"]
    },
    {
      "id": 18,
      "tasks": ["25.6", "25.7"]
    }
  ]
}
```

### Wave Explanation

**Wave 0 (Foundation):** Database schema migrations must run first to create tables.

**Wave 1 (Module Setup):** Create module structures, DTOs, interfaces, and utilities. These are independent and can run in parallel.

**Wave 2 (Service Logic):** Implement core service methods and API client functions. Depends on module structures.

**Wave 3 (Controllers & Hooks):** Implement API controllers and React Query hooks. Controllers depend on services, hooks depend on API clients.

**Wave 4 (Testing & Workers):** Write service/controller tests and implement worker extensions. Depends on complete service implementations.

**Wave 5 (Components - Part 1):** Start building UI components that depend on hooks.

**Wave 6 (Components - Part 2):** Continue component development with more complex interactions.

**Wave 7 (Pages - Part 1):** Build pages that use components and hooks.

**Wave 8 (Pages - Part 2):** Complete page implementations with metadata and routing.

**Wave 9 (Pages - Part 3):** Add advanced page features and validations.

**Wave 10 (Pages - Part 4):** Complete remaining page features and integrations.

**Wave 11 (Pages - Part 5):** Final page polish and management UI.

**Wave 12 (Integration - Part 1):** Integrate components into existing pages.

**Wave 13 (Integration - Part 2):** Complete integrations and set up PBT infrastructure.

**Wave 14 (Testing - Part 1):** Run property tests and integration tests.

**Wave 15 (Testing - Part 2):** Complete integration tests and accessibility audits.

**Wave 16 (Documentation):** Write all documentation in parallel.

**Wave 17 (Deployment Prep):** Run production migrations.

**Wave 18 (Deploy):** Deploy to Railway and Vercel in parallel.

### Parallelization Strategy

The dependency graph enables **significant parallelization**:
- **Wave 1:** 6 tasks can run simultaneously
- **Wave 2:** 6 tasks can run simultaneously
- **Wave 3:** 10 tasks can run simultaneously
- **Wave 4:** 10 tasks can run simultaneously
- **Waves 5-12:** 3-7 tasks per wave can run simultaneously

**Estimated time savings:** With parallel execution, the implementation can be completed in approximately **40-50% less time** compared to sequential execution.

### Task Conflict Prevention

Tasks are grouped to prevent conflicts:
- Tasks modifying the same file are in different waves
- Backend and frontend tasks are properly sequenced
- Database migrations run before any code that depends on them
- Tests run after the code they validate
