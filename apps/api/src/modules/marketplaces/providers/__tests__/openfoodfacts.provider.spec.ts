import { OpenFoodFactsProvider } from '../openfoodfacts.provider';

describe('OpenFoodFactsProvider', () => {
  let provider: OpenFoodFactsProvider;

  beforeEach(() => {
    provider = new OpenFoodFactsProvider();
  });

  it('is a catalog provider', () => {
    expect(provider.slug).toBe('openfoodfacts');
    expect(provider.kind).toBe('catalog');
  });

  it.todo('searchProducts: filters out empty product_name entries');
  it.todo('normalize: takes first brand from comma-separated list');
  it.todo('normalize: takes most-specific category (last in comma list)');
  it.todo('getPrices: always returns priceAvailable=false');
  it.todo('searchProducts: returns [] when upstream fails');
});
