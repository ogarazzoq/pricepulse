import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  MarketplaceProvider,
  NormalizedPriceQuote,
  NormalizedProduct,
  SearchOptions,
} from './marketplace-provider.interface';

interface KuaiProduct {
  guid: string;
  name_ru?: string;
  name_en?: string;
  name_tg?: string;
  description_ru?: string;
  description_en?: string;
  base_price?: number;
  base_price_cny?: number;
  average_rating?: number;
  rating_count?: number;
  total_stock?: number;
  in_stock?: boolean;
  external_url?: string;
  product_source?: string[];
  category_name_en?: string;
  category_name_ru?: string;
  shop_name_en?: string;
  shop_name_ru?: string;
  images?: Array<{ image_url: string; is_primary?: boolean }>;
}

interface UcodeAggregationResponse {
  data?: {
    data?: KuaiProduct[];
  };
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
  'p.base_price',
  'p.base_price_cny',
  'p.average_rating',
  'p.rating_count',
  'p.total_stock',
  'p.in_stock',
  'p.external_url',
  'p.product_source',
  'c.name_en as category_name_en',
  'c.name_ru as category_name_ru',
  's.shop_name_en',
  's.shop_name_ru',
  "COALESCE(json_agg(DISTINCT jsonb_build_object('image_url', pi.image_url, 'is_primary', pi.is_primary)) FILTER (WHERE pi.guid IS NOT NULL), '[]') as images",
];

const JOINS = [
  { type: 'LEFT', table: 'categories c', condition: 'p.categories_id = c.guid' },
  { type: 'LEFT', table: 'shops s', condition: 'p.shops_id = s.guid' },
  { type: 'LEFT', table: 'products_images pi', condition: 'p.guid = pi.products_id' },
];

const GROUP_BY = ['p.guid', 'c.guid', 's.guid'];

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

  private async query(where?: string, limit = 50, offset = 0): Promise<KuaiProduct[]> {
    const body: Record<string, any> = {
      data: {
        operation: 'SELECT',
        table: 'products as p',
        columns: COLUMNS,
        joins: JOINS,
        where: `p.is_active='true'${where ? ` AND (${where})` : ''}`,
        group_by: GROUP_BY,
        limit,
        offset,
      },
    };

    try {
      const { data } = await this.http.post<UcodeAggregationResponse>(
        '/v2/items/1/aggregation',
        body,
      );
      return data?.data?.data ?? [];
    } catch (err: any) {
      this.logger.error(`Kuai query failed: ${err?.message}`);
      return [];
    }
  }

  async listAll(limit = 50): Promise<NormalizedProduct[]> {
    const rows = await this.query(undefined, limit);
    return rows.map((p) => this.normalize(p));
  }

  async searchProducts(query: string, opts: SearchOptions = {}): Promise<NormalizedProduct[]> {
    const q = query.replace(/'/g, "''");
    const where = `p.name_ru ILIKE '%${q}%' OR p.name_en ILIKE '%${q}%' OR p.name_tg ILIKE '%${q}%'`;
    const rows = await this.query(where, opts.limit ?? 30);
    return rows.map((p) => this.normalize(p));
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
      priceAvailable: true,
      currency: product.currency,
      inStock: product.inStock,
      fetchedAt: new Date(),
    };
  }

  // -------------------------------------------------------------------

  private normalize(p: KuaiProduct): NormalizedProduct {
    const title = p.name_ru || p.name_en || p.name_tg || 'Untitled';
    const description = p.description_ru || p.description_en || undefined;
    const category = p.category_name_ru || p.category_name_en || null;
    const brand = p.shop_name_ru || p.shop_name_en || null;

    // Prefer CNY price; fall back to base_price
    const price = Number(p.base_price_cny ?? p.base_price ?? 0);
    const currency = p.base_price_cny ? 'CNY' : 'USD';

    const primaryImage = (p.images ?? []).find((i) => i.is_primary)?.image_url
      ?? p.images?.[0]?.image_url
      ?? null;

    const inStock = p.in_stock ?? (Number(p.total_stock) > 0);

    return {
      externalId: p.guid,
      marketplaceSlug: this.slug,
      title,
      description,
      brand,
      category,
      imageUrl: primaryImage,
      url: p.external_url || null,
      price,
      priceAvailable: price > 0,
      currency,
      originalPrice: null,
      discountPercent: null,
      rating: p.average_rating ? Number(p.average_rating) : null,
      ratingCount: p.rating_count ? Number(p.rating_count) : null,
      inStock,
      stockCount: p.total_stock ? Number(p.total_stock) : null,
    };
  }
}
