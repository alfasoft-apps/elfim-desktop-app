import type { PaginatedProducts, ProductDetailEnvelope, ProductListItem } from '../api/types';
import type { CachedProductRecord, DesktopCacheSnapshot } from '../types/app-data-cache';
import { resolveImageUrl } from './image-url';

export type SearchOemFilters = {
  categoryId?: number | null;
  shopId?: number | null;
};

export function productIdFromSlug(slug: string | null | undefined): number | null {
  if (!slug?.trim()) return null;
  const trimmed = slug.trim();
  const idx = trimmed.indexOf('-');
  const prefix = idx >= 0 ? trimmed.slice(0, idx) : trimmed;
  const n = parseInt(prefix, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getProducts(cache: DesktopCacheSnapshot | null): CachedProductRecord[] {
  return cache?.products ?? [];
}

export function productById(
  cache: DesktopCacheSnapshot | null,
  id: number,
): CachedProductRecord | undefined {
  return getProducts(cache).find((p) => p.id === id);
}

export function productsByShopId(
  cache: DesktopCacheSnapshot | null,
  shopId: number,
): CachedProductRecord[] {
  return getProducts(cache).filter((p) => p.shop_id === shopId);
}

export function productsByCategoryId(
  cache: DesktopCacheSnapshot | null,
  categoryId: number,
): CachedProductRecord[] {
  return getProducts(cache).filter(
    (p) =>
      p.category_id_1 === categoryId ||
      p.category_id_2 === categoryId ||
      p.category_id_3 === categoryId,
  );
}

export function productBySlug(
  cache: DesktopCacheSnapshot | null,
  slug: string,
): CachedProductRecord | undefined {
  const target = slug.trim().toLowerCase();
  const id = productIdFromSlug(slug);
  return getProducts(cache).find((p) => {
    if (p.slug && p.slug.toLowerCase() === target) return true;
    if (id != null && p.id === id) return true;
    return false;
  });
}

export function toListItem(p: CachedProductRecord): ProductListItem {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    cover: p.cover,
    unit_type: p.unit_type,
    price: p.price,
    old_price: p.old_price,
    stock_status: p.stock_status,
    shop_id: p.shop_id ?? undefined,
    product_type: p.product_type,
    category_id_1: p.category_id_1 ?? undefined,
    category_id_2: p.category_id_2 ?? undefined,
    category_id_3: p.category_id_3 ?? undefined,
  };
}

export function productDetailEnvelopeFromRecord(
  p: CachedProductRecord,
): ProductDetailEnvelope {
  const { shop_id, category_id_1, category_id_2, category_id_3, product_type, ...info } = p;
  void shop_id;
  void category_id_1;
  void category_id_2;
  void category_id_3;
  void product_type;
  return {
    ProductInfo: info as ProductDetailEnvelope['ProductInfo'],
    SimilarProducts: [],
    OtherProducts: [],
  };
}

function normalizeSearchTerm(code: string): string {
  const t = code.trim().replace(/%/g, '');
  if (!t) return '';
  return t.replace(/[-\s_.]/g, '').toLowerCase();
}

export function searchProductsInCache(
  cache: DesktopCacheSnapshot | null,
  oemCode: string,
  page: number,
  pageSize: number,
  filters?: SearchOemFilters,
): PaginatedProducts<ProductListItem> | null {
  let items = getProducts(cache);
  if (items.length === 0) return null;

  const term = normalizeSearchTerm(oemCode);
  if (term) {
    items = items.filter((p) => {
      const name = normalizeSearchTerm(String(p.name ?? ''));
      const slug = normalizeSearchTerm(String(p.slug ?? ''));
      return name.includes(term) || slug.includes(term);
    });
  }

  if (filters?.categoryId != null && filters.categoryId > 0) {
    items = productsByCategoryId({ products: items } as DesktopCacheSnapshot, filters.categoryId);
  }

  if (filters?.shopId != null && filters.shopId > 0) {
    items = items.filter((p) => p.shop_id === filters.shopId);
  }

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), lastPage);
  const start = (safePage - 1) * pageSize;

  return {
    data: items.slice(start, start + pageSize).map(toListItem),
    meta: { current_page: safePage, last_page: lastPage, total },
  };
}

export function productsByTypeFromCache(
  cache: DesktopCacheSnapshot | null,
  productType: string,
): PaginatedProducts<ProductListItem> | null {
  const t = productType.toLowerCase();
  const filtered = getProducts(cache).filter((p) =>
    String(p.product_type ?? '')
      .toLowerCase()
      .includes(t),
  );
  if (filtered.length === 0) return null;
  return {
    data: filtered.map(toListItem),
    meta: { current_page: 1, last_page: 1, total: filtered.length },
  };
}

export function findProductDetailInCache(
  cache: DesktopCacheSnapshot | null,
  slug: string,
): ProductDetailEnvelope | null {
  const row = productBySlug(cache, slug);
  if (!row) return null;
  return productDetailEnvelopeFromRecord(row);
}

export function collectImageUrlsFromCache(cache: DesktopCacheSnapshot | null): string[] {
  const set = new Set<string>();
  const add = (raw: unknown) => {
    if (typeof raw !== 'string' || !raw.trim()) return;
    const u = resolveImageUrl(raw);
    if (u) set.add(u);
  };

  for (const p of getProducts(cache)) {
    add(p.cover);
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        if (img && typeof img === 'object') add((img as { url?: string }).url);
      }
    }
  }

  for (const shop of cache?.shops ?? []) {
    if (shop && typeof shop === 'object') {
      const s = shop as Record<string, unknown>;
      add(s.logo);
    }
  }

  for (const cat of cache?.categories ?? []) {
    if (cat && typeof cat === 'object') {
      const c = cat as Record<string, unknown>;
      add(c.icon);
      add(c.cover);
    }
  }

  return [...set];
}
