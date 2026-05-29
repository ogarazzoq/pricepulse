/**
 * Stub spec — replace `it.todo` with real Jest cases when the test runner
 * is configured. Wire mock axios via msw or nock to avoid network calls.
 */
import { EscuelaJsProvider } from '../escuelajs.provider';

describe('EscuelaJsProvider', () => {
  let provider: EscuelaJsProvider;

  beforeEach(() => {
    provider = new EscuelaJsProvider();
  });

  it('declares slug + displayName', () => {
    expect(provider.slug).toBe('escuelajs');
    expect(provider.displayName).toContain('EscuelaJS');
    expect(provider.kind).toBe('marketplace');
  });

  it.todo('searchProducts: returns normalized products for a known query');
  it.todo('searchProducts: returns [] when API throws');
  it.todo('getProduct: returns null on 404');
  it.todo('normalize: strips invalid image URLs');
  it.todo('normalize: maps category.name to lower-case');
});
