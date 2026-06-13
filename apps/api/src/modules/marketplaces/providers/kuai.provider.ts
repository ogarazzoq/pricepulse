import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  MarketplaceProvider,
  NormalizedPriceQuote,
  NormalizedProduct,
  SearchOptions,
} from './marketplace-provider.interface';

interface KuaiRow {
  guid: string;
  name_ru?: string;
  name_en?: string;
  name_tg?: string;
  description_ru?: string;
  description_en?: string;
  min_price?: number;
  max_price?: number;
  average_rating?: number;
  rating_count?: number;
  total_stock?: number;
  in_stock?: boolean;
  external_url?: string;
  image_url?: string;
  category_name_en?: string;
  category_name_ru?: string;
}

interface UcodeResponse {
  data?: { data?: { data?: KuaiRow[] } };
}

const BASE_URL = 'https://api.admin.u-code.io';
const API_KEY = process.env.KUAI_API_KEY ?? 'P-1TXCwqmtp1d7fTTbtG7qkjFohkcecvoz';

const COLUMNS = [
  'p.guid',
  'p.name_ru',
  'p.name_en',
  'p.name_tg',
  'p.description_ru',
  'p.description_en',
  'p.in_stock',
  'p.total_stock',
  'p.external_url',
  'p.average_rating',
  'p.rating_count',
  'MIN(pv.price) as min_price',
  'MAX(pv.price) as max_price',
  'pi.image_url as image_url',
  'c.name_en as category_name_en',
  'c.name_ru as category_name_ru',
];

const JOINS = [
  { type: 'LEFT', table: 'product_variants pv', condition: 'p.guid = pv.products_id AND pv.is_active = true' },
  { type: 'LEFT', table: 'products_images pi', condition: 'p.guid = pi.products_id AND pi.is_primary = true' },
  { type: 'LEFT', table: 'categories c', condition: 'p.categories_id = c.guid' },
];

const GROUP_BY = ['p.guid', 'pi.image_url', 'c.name_en', 'c.name_ru'];

@Injectable()
export class KuaiProvider extends MarketplaceProvider {
  readonly slug = 'kuai';
  readonly displayName = 'Kuai';
  readonly kind = 'marketplace' as const;

  private readonly logger = new Logger(KuaiProvider.name);
  private readonly http: AxiosInstance;

  constructor() {
    super();
    this.http = axios.create({
      baseURL: BASE_URL,
      timeout: 15_000,
      headers: {
        'X-API-KEY': API_KEY,
        Authorization: 'API-KEY',
        'Content-Type': 'application/json',
      },
    });
  }

  private async query(where?: string, limit = 50): Promise<KuaiRow[]> {
    const body = {
      data: {
        operation: 'SELECT',
        table: 'products as p',
        columns: COLUMNS,
        joins: JOINS,
        where: `p.is_active = true${where ? ` AND (${where})` : ''}`,
        group_by: GROUP_BY,
        limit,
      },
    };

    try {
      const { data } = await this.http.post<UcodeResponse>('/v2/items/1/aggregation', body);
      return data?.data?.data?.data ?? [];
    } catch (err: any) {
      this.logger.error(`Kuai query failed: ${err?.message}`);
      return [];
    }
  }

  async listAll(limit = 50): Promise<NormalizedProduct[]> {
    const rows = await this.query(undefined, limit);
    return rows.map((r) => this.normalize(r));
  }

  async searchProducts(query: string, opts: SearchOptions = {}): Promise<NormalizedProduct[]> {
    const q = query.replace(/'/g, "''");
    const where = `p.name_ru ILIKE '%${q}%' OR p.name_en ILIKE '%${q}%' OR p.name_tg ILIKE '%${q}%'`;
    const rows = await this.query(where, opts.limit ?? 30);
    return rows.map((r) => this.normalize(r));
  }

  async getProduct(externalId: string): Promise<NormalizedProduct | null> {
    const rows = await this.query(`p.guid = '${externalId}'`, 1);
    if (!rows.length) return null;
    return this.normalize(rows[0]);
  }

  async getPrices(externalId: string): Promise<NormalizedPriceQuote> {
    const product = await this.getProduct(externalId);
    if (!product) throw new Error(`Kuai product ${externalId} not found`);
    return {
      externalId,
      marketplaceSlug: this.slug,
      price: product.price,
      priceAvailable: product.priceAvailable !== false,
      currency: product.currency,
      inStock: product.inStock,
      fetchedAt: new Date(),
    };
  }

  private normalize(r: KuaiRow): NormalizedProduct {
    const price = Number(r.min_price ?? 0);
    const originalPrice = r.max_price && r.max_price > price ? Number(r.max_price) : null;

    return {
      externalId: r.guid,
      marketplaceSlug: this.slug,
      title: r.name_en || r.name_ru || r.name_tg || 'Untitled',
      description: r.description_en || r.description_ru || undefined,
      brand: null,
      category: r.category_name_en || r.category_name_ru || null,
      imageUrl: r.image_url && r.image_url.length > 30 ? r.image_url : null,
      url: null, // external_url points to Taobao; kuai.tj deep-links are not available
      price,
      priceAvailable: price > 0,
      currency: 'USD',
      originalPrice,
      discountPercent: null,
      rating: r.average_rating ? Number(r.average_rating) : null,
      ratingCount: r.rating_count ? Number(r.rating_count) : null,
      inStock: r.in_stock ?? (Number(r.total_stock) > 0),
      stockCount: r.total_stock ? Number(r.total_stock) : null,
    };
  }
}
