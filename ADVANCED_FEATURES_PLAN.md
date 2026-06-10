# Advanced Professional Features - Implementation Plan

## Overview
Remaining professional features to implement for PricePulse platform.

## Feature List

### 1. ✅ Analytics Dashboard (COMPLETED)
- Enhanced with Saved Products and Search Queries metrics
- 6 stat cards total
- Real-time updates

### 2. 🔄 Bulk Operations
**Description**: Perform actions on multiple items at once

#### Backend APIs
- `POST /api/v1/saved-products/bulk/save` - Save multiple products
- `POST /api/v1/saved-products/bulk/unsave` - Remove multiple saved products
- `POST /api/v1/alerts/bulk/create` - Create alerts for multiple products
- `POST /api/v1/alerts/bulk/pause` - Pause multiple alerts
- `POST /api/v1/alerts/bulk/resume` - Resume multiple alerts
- `POST /api/v1/alerts/bulk/archive` - Archive multiple alerts
- `POST /api/v1/alerts/bulk/delete` - Delete multiple alerts

#### Frontend UI
- Checkbox selection mode in tables
- "Select All" / "Deselect All" buttons
- Bulk action dropdown menu
- Progress indicators for batch operations
- Success/error notifications

### 3. 🔄 Export to CSV
**Description**: Download data for offline analysis

#### Export Endpoints
- `GET /api/v1/saved-products/export/csv` - Export saved products
- `GET /api/v1/alerts/export/csv` - Export alerts
- `GET /api/v1/search-history/export/csv` - Export search history
- `GET /api/v1/analytics/export/csv` - Export analytics data

#### CSV Format
```csv
# Saved Products
"Title","Marketplace","Price","Currency","Saved Date","Status","URL"
"iPhone 15","Amazon","999.99","USD","2026-06-10","In Stock","https://..."

# Alerts
"Product","Target Price","Current Price","Status","Created","Last Triggered"
"MacBook Pro","2499.00","2799.00","Active","2026-06-01","2026-06-08"

# Search History
"Query","Count","Last Searched","Products Found"
"laptop","5","2026-06-10 14:30","124"
```

#### Frontend Features
- Export button with icon
- Date range filter (optional)
- Format options: CSV, Excel (XLSX)
- Download progress indicator
- Filename with timestamp

### 4. 🔄 Collections/Folders
**Description**: Organize saved products into custom categories

#### Database Schema
```prisma
model Collection {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String   // "Gaming Setup", "Work Laptops", etc.
  description String?
  color       String?  // Hex color for UI
  icon        String?  // Icon name
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  products    SavedProduct[]
  
  @@unique([userId, name])
}

// Add to SavedProduct model
model SavedProduct {
  // ... existing fields
  collectionId String?
  collection   Collection? @relation(fields: [collectionId], references: [id], onDelete: SetNull)
}
```

#### Backend APIs
- `GET /api/v1/collections` - List user's collections
- `POST /api/v1/collections` - Create new collection
- `PUT /api/v1/collections/:id` - Update collection
- `DELETE /api/v1/collections/:id` - Delete collection
- `POST /api/v1/collections/:id/products` - Add products to collection
- `DELETE /api/v1/collections/:id/products/:productId` - Remove from collection
- `POST /api/v1/collections/:id/move` - Move products between collections

#### Frontend UI
- Collections sidebar/tab
- Drag-and-drop to organize
- Color-coded collections
- Quick filter by collection
- Collection sharing (future)

### 5. 🔄 Property-Based Testing (fast-check)
**Description**: Automated testing with random data generation

#### Test Coverage
- **Marketplace Providers**
  - Product normalization
  - Price calculations
  - Currency conversions
  - Error handling
  
- **Analytics Service**
  - Percentage calculations
  - Aggregations
  - Date range queries
  
- **Search Normalization**
  - Query cleaning
  - Deduplication
  - Case sensitivity

#### Implementation
```bash
# Install dependencies
cd apps/api
npm install --save-dev fast-check @types/jest

# Create test files
# apps/api/src/modules/marketplaces/providers/__tests__/normalization.property.spec.ts
# apps/api/src/modules/analytics/__tests__/calculations.property.spec.ts
```

#### Example Tests
```typescript
import * as fc from 'fast-check';

describe('Product Normalization (Property-Based)', () => {
  it('should always return valid price', () => {
    fc.assert(
      fc.property(
        fc.record({
          price: fc.double({ min: 0, max: 1000000 }),
          currency: fc.constantFrom('USD', 'EUR', 'UZS'),
        }),
        (product) => {
          const normalized = provider.normalize(product);
          expect(normalized.price).toBeGreaterThanOrEqual(0);
          expect(normalized.currency).toMatch(/^[A-Z]{3}$/);
        }
      )
    );
  });
});
```

### 6. 🔄 E2E Testing (Playwright)
**Description**: End-to-end browser automation tests

#### Test Scenarios

**Authentication Flow**
- Register new user
- Login with credentials
- Logout
- Password reset (if implemented)

**Product Search & Save**
- Search for products
- View product details
- Save/unsave products
- Create price alert
- View saved products list

**Dashboard & Analytics**
- View dashboard stats
- Check all 6 stat cards
- Navigate between sections
- View charts and graphs

**Alerts Management**
- Create alert
- Pause/resume alert
- Archive alert
- Delete alert
- Bulk operations

**Marketplace Switching**
- Switch between marketplaces
- Filter by marketplace
- Compare prices across marketplaces

#### Implementation
```bash
# Install Playwright
cd apps/web
npm install --save-dev @playwright/test

# Initialize config
npx playwright install
```

#### Test Structure
```typescript
// apps/web/e2e/auth.spec.ts
test('user can register and login', async ({ page }) => {
  await page.goto('/register');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Test@12345');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});

// apps/web/e2e/products.spec.ts
test('user can search and save products', async ({ page }) => {
  await page.goto('/products');
  await page.fill('[placeholder="Search products"]', 'laptop');
  await page.press('[placeholder="Search products"]', 'Enter');
  await page.waitForSelector('[data-testid="product-card"]');
  await page.click('[data-testid="save-button"]:first-child');
  await expect(page.locator('[data-testid="save-button"]:first-child')).toHaveAttribute('data-saved', 'true');
});
```

## Implementation Priority

### Phase 1: Core Features (Week 1)
1. ✅ Bulk Operations (Backend + Frontend)
2. ✅ Export to CSV (Backend + Frontend)

### Phase 2: Organization (Week 2)
3. ✅ Collections/Folders (Database + Backend + Frontend)

### Phase 3: Testing (Week 3)
4. ✅ Property-Based Tests (fast-check)
5. ✅ E2E Tests (Playwright)

## Success Criteria

### Bulk Operations
- ✅ Can select multiple items with checkboxes
- ✅ Can perform actions on 10+ items simultaneously
- ✅ Shows progress and error handling
- ✅ Updates UI optimistically

### Export to CSV
- ✅ Downloads valid CSV file
- ✅ Opens correctly in Excel/Google Sheets
- ✅ Contains all relevant data
- ✅ Filename includes timestamp

### Collections
- ✅ Can create/edit/delete collections
- ✅ Can organize products into collections
- ✅ Can filter by collection
- ✅ Visual organization (colors, icons)

### Property-Based Tests
- ✅ 20+ property-based tests
- ✅ Tests run in CI/CD
- ✅ Coverage for critical paths
- ✅ Fast execution (< 30s)

### E2E Tests
- ✅ 15+ E2E test scenarios
- ✅ Tests pass on CI/CD
- ✅ Cover main user flows
- ✅ Run in headless mode

## Technology Stack

- **Bulk Operations**: NestJS batch processing, React useState
- **CSV Export**: `json2csv` (Node), `file-saver` (Browser)
- **Collections**: Prisma, PostgreSQL, React DnD
- **Property Tests**: `fast-check`, Jest
- **E2E Tests**: Playwright, TypeScript

## Timeline

| Feature | Backend | Frontend | Testing | Total |
|---------|---------|----------|---------|-------|
| Bulk Operations | 4h | 4h | 2h | 10h |
| Export CSV | 3h | 2h | 1h | 6h |
| Collections | 5h | 6h | 2h | 13h |
| Property Tests | - | - | 8h | 8h |
| E2E Tests | - | - | 10h | 10h |
| **TOTAL** | **12h** | **12h** | **23h** | **47h** |

## Notes

- All features follow existing code patterns
- Maintain type safety throughout
- Add proper error handling
- Include loading states
- Update documentation
- Deploy incrementally

---

**Status**: 📋 Planning Complete - Ready to Implement
**Start Date**: June 10, 2026
**Target Completion**: June 24, 2026

