-- =====================================================================
-- Migration Test Script
-- =====================================================================
-- This script tests the migration by verifying:
-- 1. Tables are created correctly
-- 2. Constraints are in place
-- 3. Foreign keys cascade correctly
-- 4. Indexes exist
-- =====================================================================

-- Test 1: Verify SavedProduct table structure
-- Expected: Table exists with correct columns and types
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'SavedProduct'
ORDER BY ordinal_position;

-- Test 2: Verify SearchHistory table structure
-- Expected: Table exists with correct columns and types
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'SearchHistory'
ORDER BY ordinal_position;

-- Test 3: Verify SavedProduct constraints
-- Expected: Primary key, unique constraint on (userId, productId), foreign keys
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'SavedProduct'
ORDER BY tc.constraint_type, kcu.column_name;

-- Test 4: Verify SearchHistory constraints
-- Expected: Primary key, unique constraint on (userId, normalizedQuery), foreign keys
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'SearchHistory'
ORDER BY tc.constraint_type, kcu.column_name;

-- Test 5: Verify SavedProduct indexes
-- Expected: Index on userId, unique index on (userId, productId)
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'SavedProduct'
ORDER BY indexname;

-- Test 6: Verify SearchHistory indexes
-- Expected: Index on userId, unique index on (userId, normalizedQuery), index on (userId, lastSearchedAt)
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'SearchHistory'
ORDER BY indexname;

-- Test 7: Verify foreign key cascade behavior (SavedProduct -> User)
-- Expected: ON DELETE CASCADE
SELECT
    rc.constraint_name,
    rc.update_rule,
    rc.delete_rule,
    kcu.table_name AS referencing_table,
    kcu.column_name AS referencing_column,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON rc.constraint_name = ccu.constraint_name
WHERE kcu.table_name = 'SavedProduct'
ORDER BY rc.constraint_name;

-- Test 8: Verify foreign key cascade behavior (SearchHistory -> User)
-- Expected: ON DELETE CASCADE
SELECT
    rc.constraint_name,
    rc.update_rule,
    rc.delete_rule,
    kcu.table_name AS referencing_table,
    kcu.column_name AS referencing_column,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON rc.constraint_name = ccu.constraint_name
WHERE kcu.table_name = 'SearchHistory'
ORDER BY rc.constraint_name;

-- =====================================================================
-- Expected Results Summary
-- =====================================================================
-- Test 1: SavedProduct columns
--   - id (text, not null)
--   - userId (text, not null)
--   - productId (text, not null)
--   - createdAt (timestamp, not null, default CURRENT_TIMESTAMP)
--
-- Test 2: SearchHistory columns
--   - id (text, not null)
--   - userId (text, not null)
--   - query (character varying(256), not null)
--   - normalizedQuery (character varying(256), not null)
--   - searchCount (integer, not null, default 1)
--   - lastSearchedAt (timestamp, not null)
--   - createdAt (timestamp, not null, default CURRENT_TIMESTAMP)
--
-- Test 3: SavedProduct constraints
--   - SavedProduct_pkey (PRIMARY KEY) on id
--   - SavedProduct_userId_productId_key (UNIQUE) on userId, productId
--   - SavedProduct_userId_fkey (FOREIGN KEY) userId -> User.id
--   - SavedProduct_productId_fkey (FOREIGN KEY) productId -> Product.id
--
-- Test 4: SearchHistory constraints
--   - SearchHistory_pkey (PRIMARY KEY) on id
--   - SearchHistory_userId_normalizedQuery_key (UNIQUE) on userId, normalizedQuery
--   - SearchHistory_userId_fkey (FOREIGN KEY) userId -> User.id
--
-- Test 5: SavedProduct indexes
--   - SavedProduct_pkey (unique, on id)
--   - SavedProduct_userId_idx (non-unique, on userId)
--   - SavedProduct_userId_productId_key (unique, on userId, productId)
--
-- Test 6: SearchHistory indexes
--   - SearchHistory_pkey (unique, on id)
--   - SearchHistory_userId_idx (non-unique, on userId)
--   - SearchHistory_userId_lastSearchedAt_idx (non-unique, on userId, lastSearchedAt)
--   - SearchHistory_userId_normalizedQuery_key (unique, on userId, normalizedQuery)
--
-- Test 7: SavedProduct foreign keys
--   - SavedProduct_userId_fkey: ON DELETE CASCADE ON UPDATE CASCADE
--   - SavedProduct_productId_fkey: ON DELETE CASCADE ON UPDATE CASCADE
--
-- Test 8: SearchHistory foreign keys
--   - SearchHistory_userId_fkey: ON DELETE CASCADE ON UPDATE CASCADE
-- =====================================================================
