import { readFile } from 'fs/promises';
import { join } from 'path';
import { getApiBaseUrl } from '../shared/api-base';
import { resolveImageUrl } from '../shared/image-url';
import {
  DESKTOP_CACHE_FILES,
  type CachedProductRecord,
  type DesktopCacheQuery,
} from '../shared/desktop-cache';

export type CachedSearchFilters = {
  categoryId?: number | null;
  shopId?: number | null;
};

export type CachedSearchResult = {
  data: CachedProductRecord[];
  meta: { current_page: number; last_page: number; total: number };
};

let productsMem: CachedProductRecord[] | null = null;
let dataDirPath: (() => Promise<string>) | null = null;

export function setCacheDataDirResolver(resolver: () => Promise<string>): void {
  dataDirPath = resolver;
}

async function productsFilePath(): Promise<string> {
  if (!dataDirPath) throw new Error('Cache data dir not initialized');
  return join(await dataDirPath(), DESKTOP_CACHE_FILES.products);
}

function asProducts(raw: unknown): CachedProductRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is CachedProductRecord => p != null && typeof p === 'object' && 'id' in p);
}

function filterProductsList(
  products: CachedProductRecord[],
  query: DesktopCacheQuery,
): CachedProductRecord[] {
  let list = products;
  if (query.id != null) list = list.filter((p) => p.id === query.id);
  if (query.shopId != null) list = list.filter((p) => p.shop_id === query.shopId);
  if (query.categoryId != null) {
    const cid = query.categoryId;
    list = list.filter(
      (p) => p.category_id_1 === cid || p.category_id_2 === cid || p.category_id_3 === cid,
    );
  }
  if (query.slug?.trim()) {
    const s = query.slug.trim().toLowerCase();
    const idFromSlug = productIdFromSlug(query.slug);
    list = list.filter((p) => {
      if (String(p.slug ?? '').toLowerCase() === s) return true;
      if (idFromSlug != null && p.id === idFromSlug) return true;
      return false;
    });
  }
  return list;
}

export async function reloadProductsFromDisk(): Promise<number> {
  try {
    const text = await readFile(await productsFilePath(), 'utf8');
    productsMem = asProducts(JSON.parse(text));
  } catch {
    productsMem = [];
  }
  return productsMem.length;
}

export function setProductsMemory(products: CachedProductRecord[]): void {
  productsMem = products;
}

export async function ensureProductsMemory(): Promise<CachedProductRecord[]> {
  if (productsMem === null) {
    await reloadProductsFromDisk();
  }
  return productsMem ?? [];
}

export function getProductsMemoryCount(): number {
  return productsMem?.length ?? 0;
}

function productIdFromSlug(slug: string): number | null {
  const trimmed = slug.trim();
  const idx = trimmed.indexOf('-');
  const prefix = idx >= 0 ? trimmed.slice(0, idx) : trimmed;
  const n = parseInt(prefix, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeSearchTerm(code: string): string {
  const t = code.trim().replace(/%/g, '');
  if (!t) return '';
  return t.replace(/[-\s_.]/g, '').toLowerCase();
}

export async function searchProductsInMemory(
  oemCode: string,
  page: number,
  pageSize: number,
  filters?: CachedSearchFilters,
): Promise<CachedSearchResult> {
  let items = await ensureProductsMemory();

  const term = normalizeSearchTerm(oemCode);
  if (term) {
    items = items.filter((p) => {
      const name = normalizeSearchTerm(String(p.name ?? ''));
      const slug = normalizeSearchTerm(String(p.slug ?? ''));
      return name.includes(term) || slug.includes(term);
    });
  }

  if (filters?.categoryId != null && filters.categoryId > 0) {
    const cid = filters.categoryId;
    items = items.filter(
      (p) => p.category_id_1 === cid || p.category_id_2 === cid || p.category_id_3 === cid,
    );
  }

  if (filters?.shopId != null && filters.shopId > 0) {
    items = items.filter((p) => p.shop_id === filters.shopId);
  }

  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), lastPage);
  const start = (safePage - 1) * pageSize;

  return {
    data: items.slice(start, start + pageSize),
    meta: { current_page: safePage, last_page: lastPage, total },
  };
}

export async function findProductInMemory(query: DesktopCacheQuery): Promise<CachedProductRecord | null> {
  const items = filterProductsList(await ensureProductsMemory(), query);
  return items[0] ?? null;
}

export async function collectImageUrlsFromMemory(): Promise<string[]> {
  const products = await ensureProductsMemory();
  const apiBase = getApiBaseUrl();
  const set = new Set<string>();
  const add = (raw: unknown) => {
    if (typeof raw !== 'string' || !raw.trim()) return;
    const u = resolveImageUrl(raw, apiBase);
    if (u) set.add(u);
  };

  for (const p of products) {
    add(p.cover);
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        if (img && typeof img === 'object') add((img as { url?: string }).url);
      }
    }
  }
  return [...set];
}
