/** Oflayn keş — ayrı JSON fayllar (`userData/cache/data/`). */

export const DESKTOP_CACHE_VERSION = 2;
export const APP_DATA_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

export const DESKTOP_CACHE_FILES = {
  meta: 'meta.json',
  shops: 'shops.json',
  categories: 'categories.json',
  products: 'products.json',
  companyPhones: 'company-phones.json',
  profile: 'profile.json',
  orders: 'orders.json',
  orderDetails: 'order-details.json',
} as const;

/** Laravel database notification — desktop paketində toast üçün. */
export type DesktopBundleNotification = {
  id: string;
  read_at?: string | null;
  created_at?: string | null;
  data?: {
    title?: string;
    desc?: string;
    url?: string;
    type?: string;
    [key: string]: unknown;
  };
};

export type DesktopCacheMeta = {
  version: number;
  savedAt: number;
  generatedAt?: string;
  productCount?: number;
  /** DB-də aktiv məhsul sayı — tam paket ilə müqayisə üçün (desktop diaqnostika). */
  dbProductCount?: number;
  shopCount?: number;
  categoryCount?: number;
};

/** Məhsul + tam təfərrüat; `shop_id` / `category_id_*` ilə filtrlənir. */
export type CachedProductRecord = {
  id: number;
  shop_id?: number | null;
  category_id_1?: number | null;
  category_id_2?: number | null;
  category_id_3?: number | null;
  product_type?: string | null;
  name?: string | null;
  slug?: string | null;
  cover?: string | null;
  price?: number | string | null;
  old_price?: number | string | null;
  unit_type?: string | null;
  stock_status?: boolean;
  information?: string | null;
  images?: { id: number; url?: string | null }[];
  part_numbers?: { id?: number; part_number?: string | null }[];
  product_details_table?: unknown[];
  shop?: { id?: number; title?: string | null; slug?: string | null };
  [key: string]: unknown;
};

export type DesktopCacheSnapshot = {
  savedAt: number;
  meta: DesktopCacheMeta;
  shops: unknown[];
  categories: unknown[];
  products: CachedProductRecord[];
  companyPhones: unknown[];
  profile?: unknown | null;
  orders?: unknown[];
  /** Son bildirişlər (JWT ilə paketdə); sistem toast üçün istifadə olunur. */
  notifications?: DesktopBundleNotification[];
  orderDetails?: Record<string, unknown>;
};

export type DesktopCacheQuery = {
  id?: number;
  shopId?: number;
  categoryId?: number;
  productType?: string;
  slug?: string;
};

export type AppDataCacheMeta = {
  savedAt: number | null;
  expiresAt: number | null;
  isValid: boolean;
  hasCache: boolean;
  productCount?: number;
};
