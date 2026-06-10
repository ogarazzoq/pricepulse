# Requirements Document

## Introduction

The PricePulse Engagement Suite bundles two consecutive sprints into a single production feature for the existing PricePulse multi-marketplace price comparison platform. The Suite turns the platform from a passive catalog browser into an engagement-driven product, so signed-in users can save products of interest, retain a history of meaningful searches, view a canonical SEO-friendly product detail page, configure price alerts directly from product surfaces, and receive resilient email notifications when their alert conditions trigger.

The Suite is delivered against the existing monorepo (NestJS API, Next.js 15 App Router web app, Prisma + PostgreSQL, Redis, BullMQ, Nodemailer, Telegram). All new persistence is additive: two new Prisma models (`SavedProduct`, `SearchHistory`) join the existing `User`, `Product`, `ProductOffer`, `PriceSnapshot`, `Alert`, `Notification`, `JobLog`, and `Marketplace` tables. The existing `price-sync`, `alert-evaluate`, and `notification-dispatch` BullMQ queues remain in place; this Suite extends their semantics rather than replacing them. The existing `Alert` model (with `AlertCondition`, `AlertStatus`, and `NotificationChannel` enums) is the single source of truth for price alerts — no parallel `PriceAlert` model is introduced.

This Suite assumes real users in production. All requirements MUST preserve existing functionality (auth, RBAC, throttling, swagger, marketplace sync, dashboard, analytics, admin, notifications history at `/notifications`, queue monitoring at `/admin/jobs`, mailer dry-run when SMTP env vars are unset).

## Glossary

- **API**: The NestJS backend service hosted on Railway, exposing JSON endpoints under `/api/v1`.
- **Web_App**: The Next.js 15 (App Router) frontend hosted on Vercel.
- **Saved_Products_Service**: The new API module that owns the `SavedProduct` table and its endpoints.
- **Search_History_Service**: The new API module that owns the `SearchHistory` table and its endpoints.
- **Alerts_Service**: The existing API module (`apps/api/src/modules/alerts`) that owns the `Alert` table; extended by this Suite, not replaced.
- **Notifications_Service**: The existing API module that owns the `Notification` table; extended by this Suite to record email-specific metadata.
- **Mailer_Service**: The existing wrapper around Nodemailer (`apps/api/src/infra/mailer`); MUST preserve dry-run mode when SMTP env vars are absent.
- **Price_Sync_Worker**: The existing BullMQ worker on the `price-sync` queue that upserts `ProductOffer` rows.
- **Alert_Evaluate_Worker**: The existing BullMQ worker on the `alert-evaluate` queue that runs `Alerts_Service.evaluate` for active alerts.
- **Notification_Dispatch_Worker**: The existing BullMQ worker on the `notification-dispatch` queue that delivers a `Notification` row through the configured channels.
- **Saved_Product**: A row in the new `SavedProduct` table representing a (user, product) pair that the user has hearted.
- **Search_Entry**: A row in the new `SearchHistory` table representing a normalized search query for a given user, with last-searched-at and search-count counters.
- **Normalized_Query**: The lowercased, whitespace-collapsed, trimmed form of a search query used for deduplication and lookup.
- **Slug_Page**: The canonical product detail page at the route `/products/[slug]`, served by the Web_App.
- **Id_Page**: The legacy product detail page at the route `/products/[id]`, served by the Web_App.
- **OfferComparison_Component**: The existing React component at `apps/web/src/components/products/offer-comparison.tsx` used to render per-marketplace offers with the cheapest highlighted.
- **App_URL**: The deployed web origin used to build absolute links in emails. Resolved from the env var `APP_URL` on the API and `NEXT_PUBLIC_APP_URL` on the Web_App; both MUST point at the same Vercel domain in production.
- **JWT_Auth_Guard**: The existing `JwtAuthGuard` Nest guard; every new endpoint introduced by this Suite MUST be protected by it unless explicitly noted.
- **Owner**: The `userId` value extracted from the JWT (`req.user.sub`) of the authenticated request.
- **Cooldown_Window**: A configurable duration (default 24 hours) during which the same `(alertId, offerId, price-bucket)` MUST NOT generate more than one outbound email.
- **Price_Bucket_Hash**: A deterministic hash of `(offerId, alertId, condition, threshold, price rounded to 2 decimals)` used as the dedup key for outbound emails.
- **Saved_Page**: The Web_App route `/saved` that lists the current user's Saved_Products.
- **Searches_Page**: The Web_App route `/searches` that lists the current user's recent Search_Entries.
- **Recent_Searches_Widget**: A dashboard widget showing the user's most-recently-used Search_Entries.
- **Top_Searches_Widget**: A dashboard widget showing the user's most-frequently-used Search_Entries by `searchCount`.
- **Heart_Button**: A toggle control rendered on every product card and on the Slug_Page that creates or removes a Saved_Product for the current user.
- **Saved_Count_Badge**: An accessible badge in the dashboard sidebar that shows the count of Saved_Products for the current user.

## Requirements

---

### Requirement 1: Saved Products — Persistence and Uniqueness

**User Story:** As a signed-in user, I want my saved products to be persisted and unique per (user, product), so that I can return to them across sessions and devices without duplicates.

#### Acceptance Criteria

1. THE API SHALL define a new Prisma model `SavedProduct` with fields `id` (cuid primary key), `userId` (FK to `User.id`, on-delete cascade), `productId` (FK to `Product.id`, on-delete cascade), and `createdAt` (timestamp default `now()`).
2. THE API SHALL declare a composite unique constraint on `(userId, productId)` and a non-unique index on `userId`.
3. WHEN a create operation is invoked for a `(Owner, productId)` pair that does not yet exist and the `productId` exists in `Product`, THE Saved_Products_Service SHALL create exactly one row and respond within 2000 ms.
4. IF a create operation is invoked for a `(Owner, productId)` pair that already exists, THEN THE Saved_Products_Service SHALL return the existing row with HTTP 200, SHALL NOT create a second row, and SHALL NOT mutate `createdAt`.
5. IF a create operation references a `productId` absent from `Product`, THEN THE Saved_Products_Service SHALL respond HTTP 404 and SHALL NOT create a row.
6. IF a create request body is missing `productId`, has an empty `productId`, or a non-string `productId`, THEN THE Saved_Products_Service SHALL respond HTTP 400 and SHALL NOT create a row.
7. THE API SHALL ship a Prisma migration that adds the `SavedProduct` table, its FKs, the composite unique, and the secondary index, and SHALL NOT alter, rename, or drop any existing column, constraint, or index.
8. WHEN a `User` row is deleted, THE database SHALL cascade-delete every `SavedProduct` row with that `userId` (post-delete count = 0).
9. WHEN a `Product` row is deleted, THE database SHALL cascade-delete every `SavedProduct` row referencing that `productId` (post-delete count = 0).

---

### Requirement 2: Saved Products — API Surface

**User Story:** As a frontend developer, I want a versioned, JWT-protected REST surface for saved products, so that the Web_App can list, toggle, and inspect saves with predictable contracts.

#### Acceptance Criteria

1. THE API SHALL expose `GET /api/v1/saved` returning `{ items, total, page, pageSize }`, ordered by `createdAt` descending, where `total` is the Owner's total saved count.
2. WHEN `GET /api/v1/saved` omits pagination parameters, THE Saved_Products_Service SHALL default to `page=1, pageSize=20`.
3. WHEN `GET /api/v1/saved` provides `pageSize > 100`, THE Saved_Products_Service SHALL clamp `pageSize` to 100.
4. IF `GET /api/v1/saved` provides `page < 1`, `pageSize < 1`, or non-integer pagination values, THEN THE Saved_Products_Service SHALL substitute the defaults from criterion 2.
5. THE API SHALL expose `POST /api/v1/saved` accepting `{ productId: string }`, returning HTTP 201 (new) or HTTP 200 (existing) with the Saved_Product payload, idempotent per Requirement 1.
6. THE API SHALL expose `DELETE /api/v1/saved/:productId` removing the Owner's matching row and returning HTTP 204 with empty body.
7. WHEN `DELETE /api/v1/saved/:productId` references a `productId` the Owner has not saved, THE Saved_Products_Service SHALL respond HTTP 204 (successful no-op).
8. THE API SHALL expose `GET /api/v1/saved/count` returning `{ count: number }` (0 when none saved).
9. THE API SHALL expose `GET /api/v1/saved/check/:productId` returning `{ saved: boolean }` for the Owner.
10. IF a request to any endpoint in this requirement omits, or carries a malformed, expired, or signature-invalid Bearer JWT, THEN THE API SHALL respond HTTP 401.
11. WHEN a request carries user A's JWT but addresses user B's row via body, header, or path, THE Saved_Products_Service SHALL filter strictly by the Owner and SHALL treat other users' rows as nonexistent.
12. THE `GET /api/v1/saved` response SHALL include each row's joined `product` payload (id, slug, title, imageUrl, lowestPrice, currency, marketplaceCount) to avoid N+1 follow-up calls.

---

### Requirement 3: Saved Products — Heart Button on Product Cards

**User Story:** As a user browsing the catalog, I want a heart button on every product card that I can toggle, so that I can save or unsave items without leaving the listing.

#### Acceptance Criteria

1. THE Web_App SHALL render a Heart_Button on each catalog card, on the Slug_Page hero, and on the Saved_Page grid, with a hit target of at least 44 x 44 CSS pixels.
2. THE Heart_Button SHALL render a filled-heart indicator when saved and an outlined-heart indicator when unsaved, with at least 3:1 contrast against its background.
3. WHEN the user activates the Heart_Button while unsaved, THE Web_App SHALL optimistically update query keys `['saved']`, `['saved', productId]`, and `['saved', 'count']` within 100 ms, then issue `POST /api/v1/saved` with a 10-second timeout.
4. WHEN the user activates the Heart_Button while saved, THE Web_App SHALL optimistically update the same caches within 100 ms, then issue `DELETE /api/v1/saved/:productId` with a 10-second timeout.
5. IF the mutation fails (network error, timeout, non-2xx), THEN THE Web_App SHALL roll back the optimistic cache changes and SHALL show a sonner toast (lasting 5 seconds) stating the action failed and the prior state was restored.
6. THE Heart_Button SHALL expose `aria-pressed` reflecting saved state and an `aria-label` of the form "Save <title>" / "Remove <title> from saved", falling back to "this product" when the title is missing.
7. WHILE a mutation for a given `productId` is in flight, THE Web_App SHALL disable further activations of that button.
8. WHEN rendered for an anonymous viewer, THE Heart_Button SHALL render disabled and non-interactive with an `aria-label` indicating sign-in is required.
9. IF `GET /api/v1/saved/check/:productId` fails, THEN THE Web_App SHALL default the button to the unsaved state and SHALL NOT block the card from rendering.

---

### Requirement 4: Saved Products — Saved Page

**User Story:** As a signed-in user, I want a dedicated `/saved` page, so that I can review, paginate through, and revisit the products I have hearted.

#### Acceptance Criteria

1. THE Web_App SHALL register `/saved` inside the `(dashboard)` route group; WHEN an unauthenticated viewer requests it, THE Web_App SHALL redirect to `/login`.
2. WHEN the Saved_Page mounts, THE Web_App SHALL fetch via `GET /api/v1/saved` using key `['saved', { page, pageSize }]` with `page>=1` and `pageSize` in 1..100 (default page=1, pageSize=24).
3. THE Saved_Page SHALL render a responsive grid filling the content width without horizontal scrolling at 320, 375, 768, 1024, and 1440+ pixels.
4. IF the Owner has zero Saved_Products, THEN THE Saved_Page SHALL render the `EmptyState` primitive with a CTA linking to `/products`.
5. THE Saved_Page SHALL render pagination controls when `total > pageSize`, disabling previous on page 1 and next on the last page, with a current/total page indicator.
6. WHEN the user activates a saved card (click or keyboard), THE Web_App SHALL navigate to the product's Slug_Page.
7. THE Saved_Page SHALL render each card's Heart_Button in the saved state by default.
8. WHEN the user unsaves from the Saved_Page, THE card SHALL be removed from the visible grid via the optimistic update; IF removal empties the current page and a prior page exists, THEN the view SHALL move to the previous page.
9. WHILE the initial fetch is in flight, THE Saved_Page SHALL render skeleton placeholders rather than an empty or zero-state grid.
10. IF the fetch fails, THEN THE Saved_Page SHALL render an error state with a retry control.

---

### Requirement 5: Saved Products — Sidebar Count Badge

**User Story:** As a signed-in user, I want a live count of my saved products in the sidebar, so that I can see at a glance how many items I have saved.

#### Acceptance Criteria

1. THE Web_App SHALL render a Saved_Count_Badge next to the "Saved" sidebar entry.
2. WHEN the sidebar mounts for a signed-in Owner, THE badge SHALL fetch `GET /api/v1/saved/count` using key `['saved', 'count']` and display the returned non-negative integer.
3. WHEN the Owner saves or unsaves through any Heart_Button, THE Web_App SHALL update the `['saved', 'count']` query so the badge reflects the new total within 1 second of mutation success.
4. IF the count is 0, THEN THE badge SHALL render no number while the "Saved" entry remains visible, keyboard-focusable, and activatable.
5. THE badge SHALL announce updates through an `aria-live="polite"` region.
6. WHILE in the initial loading state with no cached value, THE badge SHALL render a skeleton while other sidebar entries remain interactive.
7. WHEN the count exceeds 99, THE badge SHALL display "99+".
8. IF the count request fails, THEN THE badge SHALL preserve the last cached count (or render nothing if none) and SHALL NOT surface an error in the sidebar.

---

### Requirement 6: Search History — Capture and Deduplication

**User Story:** As a signed-in user, I want my meaningful searches to be remembered automatically, so that I can revisit and re-run them without retyping.

#### Acceptance Criteria

1. THE API SHALL define a Prisma model `SearchHistory` with `id` (cuid PK), `userId` (FK to `User.id`, cascade), `query` (string, trimmed, max 256 chars), `normalizedQuery` (string, max 256 chars), `searchCount` (integer, min 1, default 1), `lastSearchedAt` (timestamp), `createdAt` (timestamp default `now()`).
2. THE API SHALL declare a unique constraint on `(userId, normalizedQuery)`, a non-unique index on `userId`, and a non-unique index on `(userId, lastSearchedAt)`.
3. THE Search_History_Service SHALL compute `normalizedQuery` as the input lowercased, trimmed, with inner whitespace runs collapsed to a single space.
4. WHEN the Web_App detects an Owner-initiated search with trimmed length in 2..256, THE Web_App SHALL call `POST /api/v1/searches` with `{ query }`.
5. IF the trimmed query length is less than 2 or greater than 256, THEN THE Web_App SHALL NOT call `POST /api/v1/searches`.
6. WHEN `POST /api/v1/searches` is invoked for an existing `(Owner, normalizedQuery)`, THE Search_History_Service SHALL increment `searchCount` by 1, set `lastSearchedAt` to current server time, and return the updated row.
7. WHEN `POST /api/v1/searches` is invoked for a new `(Owner, normalizedQuery)`, THE Search_History_Service SHALL create a row with `searchCount=1` and `lastSearchedAt=now()`, and return it.
8. WHILE the same `(Owner, normalizedQuery)` is submitted repeatedly within a 5-second window in one browser session, THE Web_App SHALL coalesce to at most one `POST /api/v1/searches`.
9. THE API SHALL ship a migration that adds `SearchHistory` without altering existing tables.
10. IF a request to `POST /api/v1/searches` omits, or carries an invalid/expired Bearer JWT, THEN THE API SHALL respond HTTP 401.
11. IF the request body is missing `query`, non-string, empty after trim, or exceeds 256 chars, THEN THE Search_History_Service SHALL respond HTTP 400 and SHALL NOT write a row.

---

### Requirement 7: Search History — Per-User Cap

**User Story:** As a platform operator, I want each user's search history bounded, so that the database does not grow without limit.

#### Acceptance Criteria

1. THE Search_History_Service SHALL enforce a per-user cap (default 100) on `SearchHistory` rows per Owner.
2. WHEN inserting a new row for an Owner already at the cap, THE Search_History_Service SHALL, in a single transaction, evict the Owner's row with the oldest `lastSearchedAt` (tie broken by smallest `id`) before inserting.
3. WHERE `SEARCH_HISTORY_MAX_PER_USER` parses to an integer, THE service SHALL use it clamped to 10..1000 (values below 10 → 10, above 1000 → 1000).
4. IF `SEARCH_HISTORY_MAX_PER_USER` is unset or non-parseable, THEN THE service SHALL use 100 and SHALL log a startup warning for non-parseable values.
5. IF the eviction-and-insert transaction fails, THEN THE service SHALL roll back so neither the eviction nor the insert persists, and SHALL surface an error response.
6. THE service SHALL never modify or delete any row belonging to another Owner during insert, update, eviction, or delete operations for a given Owner.

---

### Requirement 8: Search History — API Surface

**User Story:** As a frontend developer, I want a versioned, JWT-protected REST surface for search history, so that the Web_App can list, capture, and clear searches predictably.

#### Acceptance Criteria

1. THE API SHALL expose `POST /api/v1/searches` per Requirement 6.
2. THE API SHALL expose `GET /api/v1/searches/recent` ordered by `lastSearchedAt` desc, optional `limit` (default 10, clamped 1..50).
3. THE API SHALL expose `GET /api/v1/searches/top` ordered by `searchCount` desc then `lastSearchedAt` desc, optional `limit` (default 5, clamped 1..50).
4. THE API SHALL expose `GET /api/v1/searches` returning `{ items, total, page, pageSize }` ordered by `lastSearchedAt` desc, with pagination defaults/clamping from Requirement 2; WHEN the Owner has zero entries, THE response SHALL be an empty array with `total=0`.
5. IF `limit` on `recent`/`top` is a non-integer, THEN THE service SHALL respond HTTP 400.
6. THE API SHALL expose `DELETE /api/v1/searches/:id` returning HTTP 204 when the `(id, Owner)` row is removed.
7. IF `DELETE /api/v1/searches/:id` targets an id absent or owned by another user, THEN THE service SHALL respond HTTP 404 and SHALL NOT mutate any row.
8. THE API SHALL expose `DELETE /api/v1/searches` removing all of the Owner's entries, returning HTTP 204.
9. IF any endpoint in this requirement receives a missing/malformed/expired Bearer JWT, THEN THE API SHALL respond HTTP 401.
10. THE Search_History_Service SHALL derive `userId` solely from the JWT and SHALL NOT accept `userId` as a path parameter, query parameter, or body field.

---

### Requirement 9: Search History — Searches Page and Dashboard Widgets

**User Story:** As a signed-in user, I want to see and re-run my recent and most-frequent searches, so that I can quickly resume past investigations.

#### Acceptance Criteria

1. THE Web_App SHALL register `/searches` inside `(dashboard)`; WHEN an unauthenticated viewer requests it, THE Web_App SHALL redirect to `/login`.
2. THE Searches_Page SHALL fetch via `GET /api/v1/searches` using key `['searches', { page, pageSize }]` (pageSize clamped 1..100) and render each entry's `query`, `lastSearchedAt`, and `searchCount`.
3. WHEN the user activates a Search_Entry on the page or a widget, THE Web_App SHALL navigate to `/products?q=<encodeURIComponent(query)>`.
4. THE Searches_Page SHALL render a "Clear all" action that opens a confirmation dialog; on confirm it calls `DELETE /api/v1/searches`; on cancel no request is sent.
5. THE Searches_Page SHALL render a per-row delete control calling `DELETE /api/v1/searches/:id`, optimistically removing the row; IF the call fails, THEN the row SHALL be restored and a toast shown.
6. THE Web_App SHALL render a Recent_Searches_Widget on `/dashboard` via `GET /api/v1/searches/recent?limit=5`.
7. THE Web_App SHALL render a Top_Searches_Widget on `/dashboard` via `GET /api/v1/searches/top?limit=5`.
8. WHEN a widget receives an empty list, THE widget SHALL render a "No searches yet" empty state at a stable minimum height that preserves dashboard grid alignment.
9. THE page and widgets SHALL render without horizontal scrolling at 320, 375, 768, 1024, and 1440+ pixels.
10. WHILE any of these queries is in its first load, THE corresponding surface SHALL render a skeleton.
11. IF any of these fetches fails, THEN the surface SHALL render an error state with a retry control.

---

### Requirement 10: Product Details — Canonical Slug Route

**User Story:** As a user (and a crawler), I want product detail pages served at a stable, slug-based URL, so that links remain meaningful and shareable.

#### Acceptance Criteria

1. THE Web_App SHALL register `/products/[slug]` inside `(dashboard)` as the canonical product detail route.
2. THE Slug_Page SHALL fetch product data server-side via `GET /api/v1/products/slug/:slug` with a 10-second timeout.
3. WHEN the API responds 404 for a slug, THE Slug_Page SHALL render Next.js `notFound()` (HTTP 404).
4. IF the server-side fetch fails for a non-404 reason (timeout, network, 5xx), THEN THE Slug_Page SHALL render an error boundary and SHALL NOT render stale or partial product content.
5. THE Web_App SHALL retain `/products/[id]`; WHEN the Id_Page resolves a product's slug from the API, THE Id_Page SHALL issue an HTTP 308 redirect to `/products/[slug]`.
6. WHEN the Id_Page cannot resolve a product for the id, THE Id_Page SHALL render `notFound()`.
7. THE Slug_Page SHALL set `<link rel="canonical">` to `${App_URL}/products/${slug}`.
8. THE Slug_Page SHALL be reachable without authentication; WHILE the viewer is anonymous, private actions (Heart_Button, "Notify me when below $X") SHALL render disabled with a sign-in affordance.

---

### Requirement 11: Product Details — Page Composition

**User Story:** As a user comparing offers across marketplaces, I want a rich product detail page, so that I can see image, description, price aggregates, ratings, and per-marketplace offers in one place.

#### Acceptance Criteria

1. THE Slug_Page SHALL render product image, title, description, brand, category, and a rating summary (average to 1 decimal, range 0.0..5.0; review count as a non-negative integer) in a hero section.
2. WHEN `imageUrl` is missing or fails to load within 5 seconds, THE Slug_Page SHALL render a deterministic placeholder rather than a broken image.
3. THE Slug_Page SHALL render lowest, highest, and average price as labeled, currency-formatted stats from `lowestPrice`, `highestPrice`, `averagePrice`.
4. THE Slug_Page SHALL render an "Available on N marketplaces" stat where N is the distinct marketplace count among offers.
5. WHEN the product has at least one priced offer, THE Slug_Page SHALL embed the OfferComparison_Component with the cheapest priced offer highlighted.
6. WHEN the product has zero offers, THE Slug_Page SHALL render an empty-offers state instead of the comparison/chart.
7. WHEN the product has at least 2 priced offers, THE Slug_Page SHALL render a price distribution chart (Recharts) mapping offer price to marketplace.
8. THE Slug_Page SHALL render a Heart_Button (Requirement 3) and a "Notify me when below $X" quick-action pre-filled with the product identifier (Requirement 14).
9. WHILE the viewer is anonymous, the Heart_Button and Notify action SHALL behave per Requirements 3.8 and 14.
10. THE Slug_Page SHALL use exactly one `<h1>` (the product title) and `<h2>` for top-level section headings with no level skipping.
11. THE Slug_Page SHALL render without horizontal scrolling at 320, 375, 768, 1024, and 1440+ pixels, including the offers list and chart.
12. IF the product cannot be loaded, THEN THE Slug_Page SHALL render the not-found or error state per Requirement 10.

---

### Requirement 12: Product Details — SEO and Open Graph Metadata

**User Story:** As a marketing operator, I want each product detail page to expose proper SEO and OpenGraph metadata, so that shared links unfurl richly and search engines index correctly.

#### Acceptance Criteria

1. THE Slug_Page SHALL export `generateMetadata` that fetches the product server-side (5-second timeout) and returns a `Metadata` object with `title`, `description`, `openGraph`, and `twitter`.
2. THE returned `title` SHALL be "<product title> — PricePulse", capped at 70 characters.
3. THE `description` SHALL be the product `description` truncated at a word boundary to 160 characters with an ellipsis; WHEN `description` is null, undefined, or whitespace-only, THE value SHALL be "Compare prices across marketplaces".
4. THE `openGraph` SHALL include `type: "website"`, `url: ${App_URL}/products/${slug}`, `siteName: "PricePulse"`, and `images` set to the product `imageUrl` when present.
5. WHEN `imageUrl` is missing, THE `openGraph.images` and `twitter.images` SHALL be set to a default PricePulse share image.
6. THE `twitter` object SHALL include `card: "summary_large_image"` and `title`/`description`/`images` exactly equal to the corresponding `openGraph` fields.
7. WHEN the API responds 404 for the slug, THE `generateMetadata` SHALL return safe default metadata so the 404 page renders without crashing.
8. IF the metadata fetch fails for a non-404 reason, THEN `generateMetadata` SHALL return the same safe default metadata.

---

### Requirement 13: Price Alerts — Lifecycle on the Existing Alert Model

**User Story:** As a signed-in user, I want full control over my price alerts (create, edit, enable, disable, delete), so that I can manage what notifies me without losing alert history.

#### Acceptance Criteria

1. THE Alerts_Service SHALL continue using the existing `Alert` model with `AlertCondition`, `AlertStatus`, and `NotificationChannel` enums; no parallel `PriceAlert` model SHALL be introduced.
2. THE API SHALL continue to expose `POST/GET/PATCH/DELETE /api/v1/alerts(/:id)`, all requiring an authenticated session (HTTP 401 otherwise).
3. WHEN the Owner issues `PATCH /api/v1/alerts/:id` with a non-empty subset of `{ threshold, condition, channels, status }`, THE Alerts_Service SHALL apply the partial update and return the serialized alert within 2000 ms.
4. IF a PATCH body contains an invalid threshold (≤0 or >999,999,999.99 or >2 decimals), an invalid enum value, an empty/duplicate `channels` array, a `status` other than ACTIVE/PAUSED, or unknown fields, THEN THE Alerts_Service SHALL respond HTTP 400 and SHALL NOT mutate the row.
5. WHEN PATCH sets `{ status: "PAUSED" }`, THE Alerts_Service SHALL set status PAUSED and the Alert_Evaluate_Worker SHALL skip the alert until it returns to ACTIVE.
6. WHEN PATCH sets `{ status: "ACTIVE" }` on a PAUSED or TRIGGERED alert, THE service SHALL set ACTIVE and SHALL NOT modify `triggeredCount` or `lastTriggeredAt`.
7. WHEN the Owner issues `DELETE /api/v1/alerts/:id`, THE service SHALL set status ARCHIVED (soft delete), SHALL NOT physically remove the row, and the Alert_Evaluate_Worker SHALL skip ARCHIVED alerts.
8. IF a PATCH or DELETE targets an id not owned by the Owner, THEN THE service SHALL respond HTTP 404 and SHALL NOT mutate any row (IDOR prevention).
9. IF a PATCH targets an already-ARCHIVED alert, THEN THE service SHALL respond HTTP 404 and SHALL NOT mutate the row.
10. THE Web_App SHALL surface `GET /api/v1/alerts` on `/alerts` with controls to edit threshold/condition, toggle ACTIVE↔PAUSED, and archive, refreshing the view within 2000 ms of a successful mutation.

---

### Requirement 14: Price Alerts — Quick-Create from Product Details and Saved Page

**User Story:** As a signed-in user looking at a product, I want to create a "notify me when below $X" alert without leaving the page, so that I can act on a price drop quickly.

#### Acceptance Criteria

1. WHERE `lowestPrice` is non-null, THE Slug_Page SHALL render a "Notify me when below $X" control prefilled to `lowestPrice * 0.9` rounded to 2 decimals, accepting values in 0.01..999,999,999.99 with at most 2 decimals.
2. WHERE `lowestPrice` is null, THE control SHALL render disabled with a tooltip "No priced offer yet" exposed on hover and keyboard focus.
3. THE Saved_Page SHALL render the same control on each saved card whose product has a non-null `lowestPrice`.
4. WHEN the user submits a valid threshold, THE Web_App SHALL `POST /api/v1/alerts` with `{ productId, condition: "BELOW", threshold, channels: ["EMAIL"] }`, then show a confirming sonner toast (auto-dismiss 5s) and invalidate `['alerts']` within 500 ms.
5. IF the submitted threshold is empty, non-numeric, ≤0, out of range, or has >2 decimals, THEN THE Web_App SHALL show an inline validation error, retain focus and the entered value, and SHALL NOT issue the request.
6. WHEN the POST succeeds and an alert already exists for `(Owner, productId, condition=BELOW)`, THE Web_App SHALL show a non-blocking toast "Alert created — you now have N alerts on this product".
7. IF the POST fails, THEN THE Web_App SHALL show an error toast and preserve the entered value for retry.
8. THE control SHALL associate its input with a visible `<label>` or `aria-label`, be reachable in tab order, operable via keyboard (Enter submits), and use `inputmode="decimal"`.

---

### Requirement 15: Email Notifications — End-to-End Pipeline

**User Story:** As a signed-in user with an active alert, I want a reliable email when an offer crosses my threshold, so that I can act on price changes without polling the app.

#### Acceptance Criteria

1. WHEN the Price_Sync_Worker upserts a `ProductOffer` whose `currentPrice` differs from its prior persisted value (or is newly inserted), THE Price_Sync_Worker SHALL enqueue an `alert-evaluate` job including `{ productId, offerId }`.
2. WHEN the Alert_Evaluate_Worker processes a job and `Alerts_Service.evaluate` returns a non-null trigger for an ACTIVE alert whose `channels` include EMAIL, THE worker SHALL call `Alerts_Service.markTriggered` and enqueue a `notification-dispatch` job with `channel = EMAIL`.
3. WHEN the Notification_Dispatch_Worker delivers successfully, THE worker SHALL set the `Notification` to `status=SENT`, `sentAt=now()`, within a 30-second delivery deadline.
4. THE Alerts_Service SHALL persist a `Notification` row per dispatched email with `metadata` `{ offerId, marketplaceSlug, oldPrice, newPrice, threshold, condition, priceBucketHash, retryCount }`.
5. IF a delivery attempt fails, THEN THE worker SHALL set `status=FAILED`, `failedAt=now()`, and `errorMessage` (truncated to 1000 chars), and rely on BullMQ retry (Requirement 17).
6. THE worker SHALL increment `metadata.retryCount` per attempt so the value equals the total number of attempts made.
7. WHEN BullMQ retries are exhausted (5 attempts), THE worker SHALL leave the `Notification` in the terminal `FAILED` state and SHALL NOT enqueue further retries.
8. WHILE the Mailer_Service is in dry-run mode (SMTP env unset), THE worker SHALL set the `Notification` to `status=SENT` with `metadata.dryRun=true` and SHALL NOT throw.

---

### Requirement 16: Email Notifications — Duplicate-Email Guard

**User Story:** As a signed-in user, I want at most one email per actual price-bucket transition for a given alert, so that I am not spammed if the offer oscillates around my threshold.

#### Acceptance Criteria

1. WHEN the Notification_Dispatch_Worker prepares an email, THE worker SHALL compute a Price_Bucket_Hash deterministically from `(alertId, offerId, condition, threshold, currentPrice rounded half-up to 2 decimals)`.
2. WHEN preparing to send, THE Notifications_Service SHALL query (within a 2-second DB timeout) for a `Notification` of the same Owner whose `metadata.priceBucketHash` equals the hash and whose `createdAt` is within the Cooldown_Window.
3. IF such a row exists, THEN THE worker SHALL NOT call the Mailer_Service.
4. WHEN a send is skipped by the dedup guard, THE worker SHALL persist the new `Notification` with `status=SENT` and `metadata.deduped=true`.
5. WHERE `ALERT_EMAIL_COOLDOWN_HOURS` parses to an integer, THE Cooldown_Window SHALL equal it clamped to 1..168 hours.
6. IF `ALERT_EMAIL_COOLDOWN_HOURS` is unset or non-parseable, THEN THE Cooldown_Window SHALL be 24 hours.
7. THE dedup guard SHALL rely solely on `Notification` rows in the database, verifiable by a worker-restart test producing no duplicate send.
8. WHEN an alert transitions TRIGGERED→ACTIVE and a later evaluation yields a different Price_Bucket_Hash, THE worker SHALL send a fresh email.
9. IF the dedup lookup times out or the DB is unavailable, THEN THE worker SHALL fail the job for BullMQ retry rather than send a possibly-duplicate email, preserving prior state.

---

### Requirement 17: Email Notifications — BullMQ Resilience and Retry

**User Story:** As a platform operator, I want the email pipeline resilient to transient SMTP failures, so that one bad burst does not silently lose notifications.

#### Acceptance Criteria

1. THE `notification-dispatch` queue SHALL be configured with `attempts=5`, `backoff={ type:"exponential", delay:5000 }`, `removeOnComplete={ age:86400 }` (seconds), `removeOnFail={ age:604800 }` (seconds).
2. WHEN a job fails, THE queue SHALL re-enqueue up to 4 additional times with exponential backoff (approximately 5s, 10s, 20s, 40s).
3. THE worker SHALL catch Mailer_Service errors so an SMTP outage SHALL NOT crash the worker process.
4. WHEN a job attempt completes (success or failure), THE worker SHALL record a `JobLog` row capturing queue, job name, status, and result/error.
5. WHEN all 5 attempts are exhausted, THE worker SHALL mark the `Notification` `status=FAILED`, `failedAt=now()`, `errorMessage` = last error (≤1000 chars), and SHALL NOT enqueue further retries.
6. WHEN `/admin/jobs` is requested, THE API SHALL surface waiting/active/completed/failed/delayed counts for `notification-dispatch`.
7. THE worker SHALL log each attempt at info and each failure at warn via pino, including job id, attempt number, and truncated error.

---

### Requirement 18: Email Notifications — Template and CTA

**User Story:** As a signed-in user, I want the alert email to clearly show the deal and link straight to the product page, so that I can act in one click.

#### Acceptance Criteria

1. WHEN a price-drop email is rendered, THE Mailer_Service SHALL set the subject to "Price Drop Alert: <product title>", capped at 100 characters.
2. THE HTML and plain-text bodies SHALL include the product title, old price, new price, absolute savings, and savings percent (1 decimal), all currency-formatted with currency code.
3. WHERE `Product.imageUrl` is non-null, THE HTML body SHALL include the image; WHERE null, THE body SHALL omit the image element (no broken image).
4. THE HTML body SHALL include exactly one CTA button and the plain-text body exactly one URL, both pointing to `${App_URL}/products/${slug}`.
5. WHEN `process.env.APP_URL` is set, THE URL SHALL use it; otherwise WHEN `process.env.NEXT_PUBLIC_APP_URL` is set, THE URL SHALL use it; IF both are unset, THEN THE URL SHALL be `/products/${slug}` and THE service SHALL log a warning.
6. THE email SHALL include the marketplace name resolved from `marketplaceSlug`→`Marketplace.name`; IF unresolved, THEN THE email SHALL display the slug value.
7. WHEN `MAIL_FROM` is set, THE From address SHALL use it; IF unset, THEN it SHALL be `noreply@pricepulse.local`.
8. THE plain-text body SHALL convey the same fields as the HTML body.

---

### Requirement 19: Email Notifications — Notifications History UI

**User Story:** As a signed-in user, I want my notifications history to show whether each email was sent, when, and how many retries it took, so that I can diagnose missing emails.

#### Acceptance Criteria

1. THE `/notifications` page SHALL render each `Notification` with `channel`, `status`, `subject`, `createdAt`, ordered by `createdAt` desc, paginated at 50 per page; `sentAt` SHALL show only for SENT; `failedAt`/`errorMessage` only for FAILED; `retryCount` only when > 0.
2. WHEN the list is empty, THE page SHALL render an empty state.
3. IF the fetch fails, THEN THE page SHALL render an error state with retry.
4. WHERE `metadata.deduped` is true, THE row SHALL render a labeled "deduped" indicator.
5. WHERE `metadata.dryRun` is true, THE row SHALL render a labeled "dry-run" indicator with an explanatory tooltip.
6. THE page SHALL allow filtering by status (SENT/FAILED/PENDING) and channel (EMAIL/TELEGRAM/IN_APP), combined with AND, defaulting to ALL, responding within 500 ms under nominal latency.
7. WHILE loading, THE page SHALL render a non-blocking loading indicator.
8. AT narrow viewports, long fields SHALL truncate rather than force horizontal scroll.
9. THE page SHALL render without horizontal scrolling at 320, 375, 768, 1024, and 1440+ pixels.
10. WHEN an unauthenticated viewer requests `/notifications`, THE Web_App SHALL redirect to `/login`.

---

### Requirement 20: Cross-Cutting Security and Ownership

**User Story:** As a platform operator, I want every new endpoint to enforce ownership consistently, so that no user can read or mutate another user's data.

#### Acceptance Criteria

1. THE API SHALL apply `JwtAuthGuard` to every controller introduced by Requirements 1–9 under the `/api/v1` prefix.
2. THE API SHALL extract the Owner exclusively from `req.user.sub` and SHALL ignore any `userId` in bodies, query strings, or path parameters of new endpoints.
3. WHEN a mutation would affect a `SavedProduct` or `SearchHistory` row whose `userId` ≠ Owner, THE service SHALL respond HTTP 404 without confirming the row's existence.
4. WHEN a read would expose a `SavedProduct` or `SearchHistory` row whose `userId` ≠ Owner, THE service SHALL omit it as if nonexistent.
5. THE Alerts_Service SHALL enforce IDOR prevention per Requirement 13.8.
6. THE API SHALL apply the existing throttler to every new endpoint with no per-endpoint relaxation.
7. THE Web_App SHALL attach the access token as a Bearer token via the existing `apiClient` for every Suite request.
8. THE Web_App SHALL NOT log the access token, JWT contents, or user email to the browser console in production builds.

---

### Requirement 21: Cross-Cutting Performance and Pagination

**User Story:** As a platform operator, I want bounded payloads and bounded database growth, so that performance scales with user count.

#### Acceptance Criteria

1. WHEN a client requests more than the cap, THE `GET /api/v1/saved` endpoint SHALL return at most 100 items by capping silently (no error).
2. THE `GET /api/v1/searches` endpoint SHALL return at most 100 items, and `recent`/`top` at most 50 each.
3. THE `SavedProduct` list, count, and check operations SHALL use the indexed columns from Requirement 1.2 with 95th-percentile latency under 200 ms at up to 1M rows.
4. THE `SearchHistory` list, recent, and top operations SHALL use the indexed columns from Requirement 6.2 with 95th-percentile latency under 200 ms at up to 1M rows.
5. WHEN the per-user cap is reached, THE Search_History_Service SHALL maintain it in O(log n) DB operations using the `(userId, lastSearchedAt)` index, leaving non-evicted rows unchanged.
6. WHEN a client omits page size, THE list endpoints SHALL default to 20 (saved page uses 24 client-side, clamped server-side).
7. IF a client supplies invalid pagination parameters, THEN THE endpoint SHALL substitute defaults and SHALL NOT modify state.

---

### Requirement 22: Cross-Cutting Accessibility

**User Story:** As a user relying on assistive technology, I want every interactive control to be usable with a keyboard and a screen reader, so that I have equal access.

#### Acceptance Criteria

1. THE Heart_Button SHALL expose `aria-pressed` (true when saved, false when unsaved), a non-empty `aria-label`, and a focus indicator of at least 2 CSS pixels with at least 3:1 contrast.
2. WHEN the saved count changes to a new value, THE Saved_Count_Badge `aria-live="polite"` region SHALL announce it within 1 second, without duplicate announcements on no-op updates.
3. THE Slug_Page SHALL contain exactly one `<h1>` and SHALL not skip heading levels.
4. THE Slug_Page SHALL use `<main>` exactly once and place interactive controls within landmark regions.
5. THE quick-create form SHALL associate each input with a visible `<label>` or `aria-label`; IF validation fails, THEN the error SHALL be linked via `aria-describedby` and `aria-invalid="true"` set on the input.
6. THE Heart_Button, quick-create button, per-row delete on `/searches`, and "Clear all" SHALL be reachable in document order via Tab, operable via Enter/Space, with no keyboard trap and a visible focus indicator.
7. WHILE `prefers-reduced-motion: reduce` is set, THE Suite SHALL not introduce decorative animations exceeding 200 ms (essential state-conveying animation permitted).
8. WHEN a modal/dialog introduced by the Suite closes, THE focus SHALL return to the triggering control, and WHILE open the focus SHALL be contained within the dialog.

---

### Requirement 23: Cross-Cutting Resilience

**User Story:** As a platform operator, I want the new and extended workers to survive transient failures, so that the critical path keeps working under stress.

#### Acceptance Criteria

1. IF the Mailer_Service throws at runtime, THEN THE Notification_Dispatch_Worker SHALL catch it, persist the failed state with a reason on the `Notification`, and re-throw so BullMQ retry (Requirement 17) triggers.
2. IF the Redis connection backing BullMQ is unavailable for up to 60 seconds, THEN THE API process SHALL NOT crash, SHALL preserve the existing ioredis reconnect behavior, and SHALL resume processing within 5 seconds of Redis recovery.
3. IF the database connection drops mid-evaluation, THEN THE Alert_Evaluate_Worker SHALL fail the job within an atomic transaction so the alert status transition and `Notification` enqueue either both persist or both roll back.
4. THE duplicate-email guard SHALL rely solely on the DB check across worker restarts and concurrent workers (Requirement 16.7).
5. WHEN the Web_App API client receives HTTP 401 for a Suite request, THE client SHALL run the refresh-token flow exactly once and replay the original request exactly once on success.
6. IF the refresh fails, THEN THE Web_App SHALL clear tokens, redirect to `/login`, and SHALL NOT retry further.

---

### Requirement 24: Cross-Cutting Mobile Responsiveness

**User Story:** As a user on a small device, I want every new page readable and usable, so that I can manage saves, searches, alerts, and product details from my phone.

#### Acceptance Criteria

1. THE Saved_Page, Searches_Page, Slug_Page, and the modified `/dashboard`, `/alerts`, and `/notifications` pages SHALL render without horizontal scrolling on the document body at 320, 375, 414, 768, 1024, and 1440 CSS pixels.
2. WHERE viewport width is at most 768 CSS pixels, THE Heart_Button hit target SHALL measure at least 44 x 44 CSS pixels.
3. WHILE viewport width is below 768 CSS pixels, THE OfferComparison_Component on the Slug_Page SHALL display offers stacked in a single column.
4. WHILE viewport width is 768..1023 CSS pixels, THE OfferComparison_Component SHALL display offers in a 2-column layout.
5. WHILE viewport width is at least 1024 CSS pixels, THE OfferComparison_Component SHALL display offers in 3 or more columns.
6. THE "Notify me when below $X" price input SHALL use `inputmode="decimal"` and SHALL NOT cause viewport zoom on focus on iOS Safari.

---

### Requirement 25: Configuration and Bootstrap

**User Story:** As a platform operator, I want the Suite to honor existing environment variables and bootstrap behavior, so that deployments to Railway and Vercel remain straightforward.

#### Acceptance Criteria

1. WHEN the API boots, THE existing idempotent bootstrap that creates marketplaces and the admin user from env vars SHALL run unchanged.
2. WHEN the API boots, THE API SHALL read `SEARCH_HISTORY_MAX_PER_USER`, `ALERT_EMAIL_COOLDOWN_HOURS`, and `APP_URL`.
3. THE Web_App SHALL read `NEXT_PUBLIC_APP_URL` for client-side absolute URLs and SHALL fall back to `window.location.origin` only on the client.
4. WHERE any new env var is absent, THE system SHALL apply the documented defaults (100; 24 hours; missing-URL warning) and SHALL NOT crash on startup.
5. IF a numeric env var holds an out-of-range or non-integer value, THEN THE system SHALL clamp or fall back to the default and SHALL log a warning.
6. THE swagger documentation at `/api/docs` SHALL describe every new endpoint, including auth requirement and request/response field names and types.

---

## Correctness Properties (for Property-Based Testing)

- **P1 — Saved Products Idempotence (R1.4):** `count(SavedProduct WHERE userId=u AND productId=p) ∈ {0,1}`; a second save is a no-op.
- **P2 — Saved Products Round-Trip (R1.4, R2.5, R2.6):** after a save/unsave sequence, the row count equals 1 iff the last op is a save, else 0.
- **P3 — Saved Products Ownership Isolation (R20.3):** no op with user A's JWT changes `count(SavedProduct WHERE userId=B)`.
- **P4 — Search History Cap Invariant (R7.1):** after every POST, `count(SearchHistory WHERE userId=u) ≤ cap`.
- **P5 — Search Normalization Dedup (R6.3, R6.6, R6.7):** if `normalize(q1)=normalize(q2)`, submitting both yields one row with `searchCount=2`.
- **P6 — Normalization Idempotence (R6.3):** `normalize(normalize(s)) = normalize(s)`.
- **P7 — Search Re-Run Round-Trip (R9.3):** navigating `/products?q=encode(query)` reproduces the same `normalizedQuery`.
- **P8 — Slug Route Never 200s for Missing (R10.2, R10.3):** API-404 slugs yield HTTP 404, never 200.
- **P9 — Slug-Id Coexistence (R10.5, R10.6):** id route 308-redirects to the slug; slug route returns 200.
- **P10 — Alert IDOR Prevention (R13.8):** PATCH/DELETE on another user's alert returns 404 with no mutation.
- **P11 — Alert Status Transition Preservation (R13.6):** status-only PATCH preserves `triggeredCount` and `lastTriggeredAt`.
- **P12 — Email Dedup Window (R16.3, R16.4):** two equal-hash evaluations within Cooldown_Window produce at most one email; the second is `deduped=true`.
- **P13 — Dedup Independence Across Buckets (R16.8):** distinct hashes produce distinct emails within the window.
- **P14 — Retry Confluence (R15.6, R17.5):** a job failing 5 times ends `FAILED` with `retryCount=5`.
- **P15 — Mailer Dry-Run Safety (R15.8, R23.1):** in dry-run, dispatch never throws and ends `SENT` with `dryRun=true`.
- **P16 — Email Subject Contract (R18.1):** subject matches `^Price Drop Alert: .+$` and contains the product title.
- **P17 — Email URL Round-Trip (R18.4, R18.5):** HTML and text bodies contain `${App_URL}/products/${slug}` (or fallback).
- **P18 — Saved Count Consistency (R2.8, R5.3):** `GET /saved/count` equals `count(SavedProduct WHERE userId=u)` across mutation boundaries.
- **P19 — Pagination Bounds (R2.3, R21.1, R21.2):** response length ≤ min(pageSize, cap) per endpoint.
- **P20 — Search Coalescing Is Lossless (R6.8):** identical submissions in the 5s window increase server `searchCount` by exactly one.

### PBT Scope Notes
fast-check fits P1, P2, P4, P5, P6, P11, P12, P13, P14, P18, P19, P20. Use 1–3 crafted integration examples for P8, P9 (routing), P15 (dry-run wiring), P16, P17 (email contracts), and P10 (IDOR), which depend on framework/infrastructure wiring rather than input variability.
