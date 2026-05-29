import { ConfigService } from '@nestjs/config';
import { BestBuyProvider } from '../bestbuy.provider';

const makeConfig = (apiKey?: string) =>
  ({ get: (k: string) => (k === 'BESTBUY_API_KEY' ? apiKey : undefined) } as unknown as ConfigService);

describe('BestBuyProvider', () => {
  it('reports disabled when no API key is set', () => {
    const provider = new BestBuyProvider(makeConfig());
    expect(provider.enabled).toBe(false);
  });

  it('reports enabled when API key is set', () => {
    const provider = new BestBuyProvider(makeConfig('test_key'));
    expect(provider.enabled).toBe(true);
  });

  it.todo('searchProducts: returns [] when disabled');
  it.todo('searchProducts: passes query through DSL filter syntax');
  it.todo('normalize: computes discountPercent from sale vs regular price');
  it.todo('normalize: prefers shortDescription over longDescription');
  it.todo('normalize: extracts most-specific category from categoryPath');
});
