# Task 4.1 Verification: Extend AlertsService for Status Transitions

## Task Summary
Extended AlertsService to support status transitions (ACTIVE ↔ PAUSED) with proper validation and IDOR prevention.

## Changes Made

### 1. UpdateAlertDto (`dto/update-alert.dto.ts`)

**Added Fields:**
- `threshold` - Optional, 0.01-999,999,999.99, max 2 decimals
- `condition` - Optional, enum AlertCondition (BELOW, ABOVE, PERCENT_DROP)
- `channels` - Optional, array of NotificationChannel (min 1, unique)
- `status` - Optional, restricted to ACTIVE or PAUSED only

**Validation:**
- ✅ Threshold validation: min 0.01, max 999,999,999.99, max 2 decimal places
- ✅ Condition enum validation
- ✅ Channels array validation: min size 1, unique values, each must be valid NotificationChannel
- ✅ Status restricted to ACTIVE/PAUSED only (Requirement 13.3, 13.4)

### 2. AlertsService (`alerts.service.ts`)

**Updated Methods:**

#### `update(userId: string, id: string, dto: UpdateAlertDto)`
- ✅ Filters by userId AND id (IDOR prevention - Requirement 13.8)
- ✅ Returns 404 if alert not found or not owned by user
- ✅ Returns 404 if alert is already ARCHIVED (Requirement 13.9)
- ✅ Preserves triggeredCount and lastTriggeredAt during status changes (Requirement 13.6)
- ✅ Applies partial updates to threshold, condition, channels, status

#### `archive(userId: string, id: string)`
- ✅ Filters by userId AND id (IDOR prevention - Requirement 13.8)
- ✅ Returns 404 if alert not found or not owned by user
- ✅ Returns 404 if alert is already ARCHIVED (Requirement 13.9)
- ✅ Sets status to ARCHIVED (soft delete - Requirement 13.7)

#### `listByUser(userId: string)`
- ✅ Filters out ARCHIVED alerts (only returns ACTIVE, PAUSED, TRIGGERED)
- ✅ Orders by createdAt desc

## Requirements Satisfied

### From Requirement 13: Price Alerts — Lifecycle on the Existing Alert Model

✅ **13.3** - PATCH endpoint accepts partial updates with status field
✅ **13.4** - Validation rejects invalid threshold, enum values, empty/duplicate channels, status other than ACTIVE/PAUSED
✅ **13.5** - PATCH with status=PAUSED sets status to PAUSED (Alert_Evaluate_Worker will skip)
✅ **13.6** - PATCH with status=ACTIVE preserves triggeredCount and lastTriggeredAt
✅ **13.7** - DELETE (archive) sets status ARCHIVED, does not physically remove row
✅ **13.8** - PATCH/DELETE returns 404 when targeting non-owned alert (IDOR prevention)
✅ **13.9** - PATCH/DELETE on ARCHIVED alert returns 404

## Testing Verification

### Manual Testing Scenarios

1. **Status Transition: ACTIVE → PAUSED**
   - Create alert with status=ACTIVE
   - PATCH with status=PAUSED
   - Verify status changed, triggeredCount/lastTriggeredAt preserved

2. **Status Transition: PAUSED → ACTIVE**
   - Create alert, trigger it (set TRIGGERED status manually)
   - PATCH with status=ACTIVE
   - Verify status changed to ACTIVE, triggeredCount/lastTriggeredAt preserved

3. **IDOR Prevention**
   - User A creates alert
   - User B attempts to PATCH/DELETE User A's alert
   - Verify 404 response, no mutation

4. **Archive Idempotency**
   - Create alert
   - DELETE (archive) once - succeeds
   - DELETE (archive) again - returns 404

5. **Validation Tests**
   - PATCH with invalid threshold (negative, >999,999,999.99, >2 decimals) - 400
   - PATCH with invalid condition - 400
   - PATCH with empty channels array - 400
   - PATCH with duplicate channels - 400
   - PATCH with status=TRIGGERED or status=ARCHIVED - 400

## Build Verification

✅ TypeScript compilation successful
✅ No diagnostic errors
✅ All imports resolved correctly

## Next Steps

The implementation is complete and ready for:
1. Property-based testing (Task 4.2)
2. Integration testing (Task 4.5)
3. Frontend integration (Tasks 18.1, 18.2)

## Files Modified

1. `apps/api/src/modules/alerts/dto/update-alert.dto.ts` - Extended with full validation
2. `apps/api/src/modules/alerts/alerts.service.ts` - Updated update() and archive() methods
