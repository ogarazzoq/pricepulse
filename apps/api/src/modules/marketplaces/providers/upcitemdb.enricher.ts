import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { EnrichmentInput, EnrichmentProvider, EnrichmentResult } from './enrichment-provider.interface';

interface UpcItemDbItem {
  ean?: string;
  upc?: string;
  title?: string;
  description?: string;
  brand?: string;
  model?: string;
  category?: string;
  images?: string[];
}

interface UpcItemDbResponse {
  code: string;
  total: number;
  items: UpcItemDbItem[];
}

/**
 * UPC Item Database — enrichment-only.
 *
 * Modes:
 *  - Free trial endpoint  https://api.upcitemdb.com/prod/trial/lookup  (no key, IP-rate-limited)
 *  - Paid endpoint        https://api.upcitemdb.com/prod/v1/lookup     (requires user_key header)
 *
 * Strategy:
 *  - If a barcode is already known on the product → /lookup?upc=
 *  - Otherwise → /search?s=<title>+<brand>  to attempt a barcode resolution
 *  - On success, fill missing fields only (never overwrite existing).
 */
@Injectable()
export class UpcItemDbEnricher extends EnrichmentProvider {
  readonly slug = 'upcitemdb';
  readonly displayName = 'UPC Item Database';

  private readonly logger = new Logger(UpcItemDbEnricher.name);
  private readonly http: AxiosInstance;
  private readonly apiKey?: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiKey = this.config.get<string>('UPCITEMDB_API_KEY')?.trim() || undefined;
    const base = this.apiKey
      ? 'https://api.upcitemdb.com/prod/v1'
      : 'https://api.upcitemdb.com/prod/trial';
    this.http = axios.create({
      baseURL: base,
      timeout: 8_000,
      headers: this.apiKey ? { user_key: this.apiKey } : {},
    });
    this.logger.log(
      `UPC Item DB enricher initialized in ${this.apiKey ? 'paid' : 'trial'} mode`,
    );
  }

  override get enabled(): boolean {
    // Trial mode works without a key but is heavily rate-limited.
    return true;
  }

  async enrich(input: EnrichmentInput): Promise<EnrichmentResult | null> {
    try {
      const item = input.barcode
        ? await this.lookupByUpc(input.barcode)
        : await this.searchByTitle(input.title, input.brand);

      if (!item) return null;

      return {
        brand: item.brand ?? null,
        category: item.category?.toLowerCase() ?? null,
        barcode: item.upc ?? item.ean ?? null,
        mpn: item.model ?? null,
        imageUrl: item.images?.[0] ?? null,
        description: item.description ?? null,
      };
    } catch (err: any) {
      // Trial mode hits 429 frequently; that's not a real error.
      if (err.response?.status === 429) {
        this.logger.debug(`UPC Item DB rate-limited for "${input.title}"`);
      } else {
        this.logger.warn(`UPC Item DB enrich failed: ${err?.message}`);
      }
      return null;
    }
  }

  private async lookupByUpc(upc: string): Promise<UpcItemDbItem | null> {
    const { data } = await this.http.get<UpcItemDbResponse>('/lookup', { params: { upc } });
    return data?.items?.[0] ?? null;
  }

  private async searchByTitle(title: string, brand?: string | null): Promise<UpcItemDbItem | null> {
    const q = [brand, title].filter(Boolean).join(' ').slice(0, 80);
    const { data } = await this.http.get<UpcItemDbResponse>('/search', {
      params: { s: q, match_mode: 0, type: 'product' },
    });
    return data?.items?.[0] ?? null;
  }
}
