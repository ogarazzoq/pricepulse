import { computePriceBucketHash } from './price-bucket-hash.util';

describe('computePriceBucketHash', () => {
  it('should generate a 16-character hexadecimal hash', () => {
    const hash = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.50,
    );

    expect(hash).toBeDefined();
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('should generate the same hash for identical inputs', () => {
    const hash1 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.50,
    );
    const hash2 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.50,
    );

    expect(hash1).toBe(hash2);
  });

  it('should generate the same hash for prices that round to the same 2 decimals', () => {
    const hash1 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.504,
    );
    const hash2 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.501,
    );

    // Both should round to 85.50
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different alertIds', () => {
    const hash1 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.50,
    );
    const hash2 = computePriceBucketHash(
      'alert-999',
      'offer-456',
      'BELOW',
      99.99,
      85.50,
    );

    expect(hash1).not.toBe(hash2);
  });

  it('should generate different hashes for different offerIds', () => {
    const hash1 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.50,
    );
    const hash2 = computePriceBucketHash(
      'alert-123',
      'offer-999',
      'BELOW',
      99.99,
      85.50,
    );

    expect(hash1).not.toBe(hash2);
  });

  it('should generate different hashes for different conditions', () => {
    const hash1 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.50,
    );
    const hash2 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'ABOVE',
      99.99,
      85.50,
    );

    expect(hash1).not.toBe(hash2);
  });

  it('should generate different hashes for different thresholds', () => {
    const hash1 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.50,
    );
    const hash2 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      89.99,
      85.50,
    );

    expect(hash1).not.toBe(hash2);
  });

  it('should generate different hashes for different price buckets', () => {
    const hash1 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.50,
    );
    const hash2 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.51,
    );

    expect(hash1).not.toBe(hash2);
  });

  it('should handle edge case: price with many decimals', () => {
    const hash1 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.123456789,
    );
    const hash2 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.12,
    );

    // 85.123456789 rounds to 85.12
    expect(hash1).toBe(hash2);
  });

  it('should handle edge case: price of 0', () => {
    const hash = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      0,
    );

    expect(hash).toBeDefined();
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('should handle edge case: very large price', () => {
    const hash = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      999999999.99,
      999999999.99,
    );

    expect(hash).toBeDefined();
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('should handle edge case: negative price', () => {
    const hash = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      -10.50,
    );

    expect(hash).toBeDefined();
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('should be deterministic across multiple calls', () => {
    const hashes = Array.from({ length: 10 }, () =>
      computePriceBucketHash('alert-123', 'offer-456', 'BELOW', 99.99, 85.50),
    );

    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(1);
  });

  it('should round 0.495 to 0.50 (banker rounding)', () => {
    const hash1 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      0.495,
    );
    const hash2 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      0.50,
    );

    // Math.round(0.495 * 100) / 100 = Math.round(49.5) / 100 = 50 / 100 = 0.50
    expect(hash1).toBe(hash2);
  });

  it('should correctly bucket prices at rounding boundaries', () => {
    // Test that 85.494 rounds to 85.49
    const hash1 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.494,
    );
    const hash2 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.49,
    );
    expect(hash1).toBe(hash2);

    // Test that 85.495 rounds to 85.50
    const hash3 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.495,
    );
    const hash4 = computePriceBucketHash(
      'alert-123',
      'offer-456',
      'BELOW',
      99.99,
      85.50,
    );
    expect(hash3).toBe(hash4);

    // Verify 85.49 and 85.50 produce different hashes
    expect(hash1).not.toBe(hash3);
  });
});
