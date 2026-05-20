/** @deprecated — `desktop-cache.ts` istifadə edin (ayrı JSON fayllar). */

export { APP_DATA_CACHE_TTL_MS, type AppDataCacheMeta } from './desktop-cache';

export type AppDataCacheFile = {
  savedAt: number;
  bundle: AppDataBundle;
};

/** Köhnə vahid paket — yalnız uyğunluq üçün. */
export type AppDataBundle = {
  categories: unknown;
  shops: unknown;
  allProducts?: unknown[];
  products: {
    all: unknown;
    new: unknown;
    popular: unknown;
    onsale: unknown;
  };
  shopProducts: Record<string, unknown>;
  companyPhones: unknown;
  profile?: unknown;
  orders?: unknown;
  meta?: {
    productCount?: number;
    shopCount?: number;
    categoryCount?: number;
    chunkSize?: number;
  };
  generatedAt?: string;
  productDetails?: Record<string, unknown>;
  orderDetails?: Record<string, unknown>;
};
