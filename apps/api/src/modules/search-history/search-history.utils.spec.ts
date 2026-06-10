import { normalizeQuery } from './search-history.utils';

describe('normalizeQuery', () => {
  it('should trim leading and trailing whitespace', () => {
    expect(normalizeQuery('  hello  ')).toBe('hello');
    expect(normalizeQuery('\t\nhello\n\t')).toBe('hello');
  });

  it('should convert to lowercase', () => {
    expect(normalizeQuery('HELLO WORLD')).toBe('hello world');
    expect(normalizeQuery('HeLLo WoRLd')).toBe('hello world');
  });

  it('should collapse multiple whitespace characters to single space', () => {
    expect(normalizeQuery('hello   world')).toBe('hello world');
    expect(normalizeQuery('hello\t\tworld')).toBe('hello world');
    expect(normalizeQuery('hello\n\nworld')).toBe('hello world');
    expect(normalizeQuery('hello  \t\n  world')).toBe('hello world');
  });

  it('should handle empty string', () => {
    expect(normalizeQuery('')).toBe('');
  });

  it('should handle string with only whitespace', () => {
    expect(normalizeQuery('   ')).toBe('');
    expect(normalizeQuery('\t\n  \t')).toBe('');
  });

  it('should handle complex case with all transformations', () => {
    expect(normalizeQuery('  Wireless   HEADPHONES  \t\n')).toBe('wireless headphones');
    expect(normalizeQuery('  Test\t\tQuery\n\nWith   Spaces  ')).toBe('test query with spaces');
  });

  it('should be idempotent (normalizing twice gives same result)', () => {
    const input = '  Hello   WORLD  ';
    const normalized = normalizeQuery(input);
    expect(normalizeQuery(normalized)).toBe(normalized);
  });
});
