import { ConfigService } from '@nestjs/config';
import { UpcItemDbEnricher } from '../upcitemdb.enricher';

const makeConfig = (apiKey?: string) =>
  ({ get: (k: string) => (k === 'UPCITEMDB_API_KEY' ? apiKey : undefined) } as unknown as ConfigService);

describe('UpcItemDbEnricher', () => {
  it('initializes in trial mode without an API key', () => {
    const enricher = new UpcItemDbEnricher(makeConfig());
    expect(enricher.slug).toBe('upcitemdb');
    expect(enricher.enabled).toBe(true);
  });

  it.todo('enrich: looks up by UPC when barcode is present');
  it.todo('enrich: searches by title when barcode is missing');
  it.todo('enrich: returns null on 429 rate-limit');
  it.todo('enrich: never returns fields the upstream did not provide');
});
