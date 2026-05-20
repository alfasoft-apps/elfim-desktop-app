import http from './http';
import { fetchWithAppCache } from './cache-fetch';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiEnvelope,
  BannerDto,
  BannersFetchResult,
  CartPayload,
  CategoryItem,
  CompanyPhoneNumber,
  CreateOrderPayload,
  CreateOrderResult,
  NotificationsGroupedResponse,
  OrderDetail,
  OrderSummary,
  PaginatedProducts,
  ProductDetailEnvelope,
  ProductGroupSection,
  ProductListItem,
  ShopListItem,
  UserDto,
} from './types';
import { extractProductListFromEnvelope, parsePaginatedProducts } from './parse';
import { useAppDataCacheStore } from '../stores/appDataCache';
import { useNetworkStatusStore } from '../stores/networkStatus';
import {
  findProductDetailInCache,
  productDetailEnvelopeFromRecord,
  productIdFromSlug,
  productsByShopId,
  productsByTypeFromCache,
  searchProductsInCache,
  toListItem,
} from '../utils/desktop-cache-query';
import type { CachedProductRecord } from '../types/app-data-cache';
import type { SearchOemFilters } from '../utils/desktop-cache-query';
import { persistLastAccountEmail } from '../utils/last-account-cache';

function envelopeData<T>(raw: unknown): T | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return raw as T;
  if (typeof raw === 'object' && 'data' in raw) {
    return (raw as ApiEnvelope<T>).data;
  }
  return raw as T;
}

/** Vahid keş paketini yükləyir (onlayn). */
export async function syncDesktopAppBundle(force = false): Promise<boolean> {
  return useAppDataCacheStore().syncBundle(force);
}

export async function login(email: string, password: string): Promise<void> {
  const { data } = await http.post<ApiEnvelope<{ token?: string }>>(API_ENDPOINTS.LOGIN, {
    email,
    password,
  });
  const token = data?.data?.token;
  if (!token) throw new Error(data?.message || 'Giriş tokenu alınmadı.');
  localStorage.setItem('auth_token', token);
  persistLastAccountEmail(email);
}

export async function logout(): Promise<void> {
  try {
    await http.post(API_ENDPOINTS.LOGOUT);
  } finally {
    localStorage.removeItem('auth_token');
  }
}

export async function fetchMe(): Promise<UserDto | null> {
  const cache = useAppDataCacheStore();
  return fetchWithAppCache(
    async () => {
      const { data } = await http.get<ApiEnvelope<UserDto>>(API_ENDPOINTS.ME);
      const user = data?.data ?? null;
      if (user) await cache.patchCache({ profile: user });
      return user;
    },
    () => envelopeData<UserDto>(cache.cache?.profile) ?? null,
  );
}

export async function fetchProductsByType(
  page: number,
  pageSize: number,
  productType: string,
): Promise<PaginatedProducts<ProductListItem>> {
  const q = `paginate=${pageSize}&page=${page}&product_type=${encodeURIComponent(productType)}`;
  const cache = useAppDataCacheStore();
  return fetchWithAppCache(
    async () => {
      const url = `${API_ENDPOINTS.PRODUCTS}?${q}`;
      const { data } = await http.get(url);
      return parsePaginatedProducts(data, { url });
    },
    async () => {
      if (typeof window.elfim?.queryCachedProducts === 'function') {
        const rows = await window.elfim.queryCachedProducts({ productType });
        if (rows.length > 0) {
          return {
            data: rows.map(toListItem),
            meta: { current_page: 1, last_page: 1, total: rows.length },
          };
        }
      }
      return productsByTypeFromCache(cache.cache, productType) ?? undefined;
    },
  );
}

export async function fetchCategories(): Promise<CategoryItem[]> {
  const cache = useAppDataCacheStore();
  return fetchWithAppCache(
    async () => {
      const { data } = await http.get<ApiEnvelope<CategoryItem[]>>(API_ENDPOINTS.CATEGORIES);
      const list = data?.data ?? [];
      await cache.patchCache({ categories: list });
      return list;
    },
    () => envelopeData<CategoryItem[]>(cache.cache?.categories) ?? [],
  );
}

/** JSON cavabında camelCase və ya snake_case sahələri qəbul edir. */
export function normalizeProductEnvelope(raw: ProductDetailEnvelope | Record<string, unknown> | undefined | null) {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const pi =
    r.ProductInfo ??
    r.productInfo ??
    r.product_info ??
    null;
  const sim = r.SimilarProducts ?? r.similarProducts ?? r.similar_products;
  const other = r.OtherProducts ?? r.otherProducts ?? r.other_products;
  return {
    ProductInfo: pi as ProductDetailEnvelope['ProductInfo'],
    SimilarProducts: Array.isArray(sim) ? sim : [],
    OtherProducts: Array.isArray(other) ? other : [],
  };
}

export async function fetchProductDetail(slug: string): Promise<ProductDetailEnvelope | null> {
  const cache = useAppDataCacheStore();
  return fetchWithAppCache(
    async () => {
      const { data: body } = await http.get<unknown>(
        `${API_ENDPOINTS.PRODUCT}/${encodeURIComponent(slug)}`,
      );
      const merged = parseProductDetailBody(body);
      if (merged?.ProductInfo && cache.cache) {
        const info = merged.ProductInfo;
        const products = [...cache.cache.products];
        const idx = products.findIndex((p) => p.id === info.id);
        const row = {
          ...(idx >= 0 ? products[idx] : {}),
          ...info,
          id: info.id,
          shop_id: info.shop?.id ?? products[idx]?.shop_id,
        } as CachedProductRecord;
        if (idx >= 0) products[idx] = row;
        else products.push(row);
        await cache.patchCache({ products });
      }
      return merged;
    },
    async () => {
      const id = productIdFromSlug(slug);
      if (typeof window.elfim?.queryCachedProducts === 'function') {
        const rows = await window.elfim.queryCachedProducts(
          id != null ? { id } : { slug },
        );
        if (rows[0]) return productDetailEnvelopeFromRecord(rows[0]);
      }
      return findProductDetailInCache(cache.cache, slug);
    },
  );
}

export function parseProductDetailBody(body: unknown): ProductDetailEnvelope | null {
  if (!body || typeof body !== 'object') return null;
  const root = body as Record<string, unknown>;
  if (root.data && Array.isArray(root.data)) return null;
  const env = body as ApiEnvelope<Record<string, unknown>>;
  return normalizeProductEnvelope(env?.data as ProductDetailEnvelope);
}

export type { SearchOemFilters } from '../utils/desktop-cache-query';

/** Boş kod üçün server tərəfində `%%` ilə geniş məhsul siyahısı (POS default). */
export async function searchOem(
  oemCode: string,
  page: number,
  pageSize: number,
  filters?: SearchOemFilters,
): Promise<PaginatedProducts<ProductListItem>> {
  const code = oemCode.trim() || '%%';
  let q = `oem_code=${encodeURIComponent(code)}&paginate=${pageSize}&page=${page}`;
  if (filters?.categoryId != null && filters.categoryId > 0) {
    q += `&category_id=${encodeURIComponent(String(filters.categoryId))}`;
  }
  if (filters?.shopId != null && filters.shopId > 0) {
    q += `&shop_id=${encodeURIComponent(String(filters.shopId))}`;
  }
  const cache = useAppDataCacheStore();
  const network = useNetworkStatusStore();

  return fetchWithAppCache(
    async () => {
      const url = `${API_ENDPOINTS.SEARCH_OEM}?${q}`;
      const { data } = await http.get(url);
      return parsePaginatedProducts(data, { url });
    },
    async () => {
      if (typeof window.elfim?.searchCachedProductsOem === 'function') {
        const payload = {
          oemCode: code,
          page,
          pageSize,
          categoryId: filters?.categoryId,
          shopId: filters?.shopId,
        };
        let result = await window.elfim.searchCachedProductsOem(payload);

        if (
          !network.isOnline &&
          result.meta.total === 0 &&
          cache.displayProductCount > 0 &&
          typeof window.elfim.reloadCachedProductsFromDisk === 'function'
        ) {
          await window.elfim.reloadCachedProductsFromDisk();
          await cache.refreshMainProductCount();
          result = await window.elfim.searchCachedProductsOem(payload);
        }

        return {
          data: result.data.map(toListItem),
          meta: result.meta,
        };
      }
      return searchProductsInCache(cache.cache, code, page, pageSize, filters) ?? undefined;
    },
  );
}

export async function searchProductNamesByCodeList(csv: string): Promise<ProductListItem[]> {
  const q = `code_list=${encodeURIComponent(csv)}`;
  const { data } = await http.get(`${API_ENDPOINTS.SEARCH_PRODUCT_NAME_BY_LIST}?${q}`);
  return extractProductListFromEnvelope(data);
}

export async function searchCodeListGrouped(csv: string): Promise<ProductGroupSection[]> {
  const q = `code_list=${encodeURIComponent(csv)}`;
  const { data } = await http.get<unknown>(`${API_ENDPOINTS.SEARCH_CODE_LIST}?${q}`);
  if (!data || typeof data !== 'object') return [];
  const root = data as Record<string, unknown>;
  if (!root.data || typeof root.data !== 'object' || Array.isArray(root.data)) return [];
  const block = root.data as Record<string, unknown>;
  const sections: ProductGroupSection[] = [];
  for (const [title, val] of Object.entries(block)) {
    if (!Array.isArray(val)) continue;
    sections.push({ title, items: val as ProductListItem[] });
  }
  return sections;
}

export async function fetchShops(): Promise<ShopListItem[]> {
  const cache = useAppDataCacheStore();
  return fetchWithAppCache(
    async () => {
      const { data } = await http.get<ApiEnvelope<ShopListItem[]>>(API_ENDPOINTS.MANUFACTURING_FIRMS);
      const list = data?.data ?? [];
      await cache.patchCache({ shops: list });
      return list;
    },
    () => envelopeData<ShopListItem[]>(cache.cache?.shops) ?? [],
  );
}

export async function fetchShopProducts(
  shopSlug: string,
  page: number,
  pageSize: number,
  search?: string,
): Promise<PaginatedProducts<ProductListItem>> {
  let q = `paginate=${pageSize}&page=${page}`;
  if (search?.trim()) q += `&search=${encodeURIComponent(search.trim())}`;
  const cache = useAppDataCacheStore();
  return fetchWithAppCache(
    async () => {
      const url = `${API_ENDPOINTS.MANUFACTURING_FIRMS}/${encodeURIComponent(shopSlug)}/products?${q}`;
      const { data } = await http.get(url);
      return parsePaginatedProducts(data, { url });
    },
    () => {
      if (page !== 1 || search?.trim()) return undefined;
      const shops = envelopeData<ShopListItem[]>(cache.cache?.shops) ?? [];
      const shop = shops.find((s) => s.slug === shopSlug);
      if (!shop?.id) return undefined;
      const rows = productsByShopId(cache.cache, shop.id);
      const start = (page - 1) * pageSize;
      const slice = rows.slice(start, start + pageSize);
      return {
        data: slice.map(toListItem),
        meta: {
          current_page: page,
          last_page: Math.max(1, Math.ceil(rows.length / pageSize)),
          total: rows.length,
        },
      };
    },
  );
}

export async function fetchCompanyPhones(): Promise<CompanyPhoneNumber[]> {
  const cache = useAppDataCacheStore();
  return fetchWithAppCache(
    async () => {
      const { data } = await http.get<ApiEnvelope<CompanyPhoneNumber[]>>(
        API_ENDPOINTS.COMPANY_PHONE_NUMBERS,
      );
      const list = data?.data ?? [];
      await cache.patchCache({ companyPhones: list });
      return list;
    },
    () => envelopeData<CompanyPhoneNumber[]>(cache.cache?.companyPhones) ?? [],
  );
}

export async function fetchCart(): Promise<CartPayload | null> {
  const { data: body } = await http.get<unknown>(API_ENDPOINTS.MY_SHOPPING_CART);
  if (!body || typeof body !== 'object') return null;
  const root = body as Record<string, unknown>;
  if (!('data' in root)) return null;
  const inner = root.data;
  if (Array.isArray(inner)) return { isEmpty: true, items: [], totalItems: 0, total: 0 };
  return inner as CartPayload;
}

function parseOrdersBody(body: unknown): OrderSummary[] {
  if (!body || typeof body !== 'object') return [];
  const root = body as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data as OrderSummary[];
  if (root.data && typeof root.data === 'object' && 'data' in (root.data as object)) {
    const inner = (root.data as Record<string, unknown>).data;
    if (Array.isArray(inner)) return inner as OrderSummary[];
  }
  const env = body as ApiEnvelope<OrderSummary[]>;
  return env?.data ?? [];
}

export async function fetchOrders(): Promise<OrderSummary[]> {
  const cache = useAppDataCacheStore();
  return fetchWithAppCache(
    async () => {
      const { data: body } = await http.get<unknown>(API_ENDPOINTS.MY_ORDERS);
      const list = parseOrdersBody(body);
      await cache.patchCache({ orders: list });
      return list;
    },
    () => envelopeData<OrderSummary[]>(cache.cache?.orders) ?? [],
  );
}

export async function fetchOrderDetail(id: number): Promise<OrderDetail | null> {
  const cache = useAppDataCacheStore();
  const key = String(id);
  return fetchWithAppCache(
    async () => {
      const { data } = await http.get<ApiEnvelope<OrderDetail>>(`${API_ENDPOINTS.MY_ORDERS}/${id}`);
      const detail = data?.data ?? null;
      if (detail) {
        await cache.patchCache({
          orderDetails: { ...(cache.cache?.orderDetails ?? {}), [key]: detail },
        });
      }
      return detail;
    },
    () => {
      const hit = cache.cache?.orderDetails?.[key];
      return hit ? (hit as OrderDetail) : null;
    },
  );
}

/** Laravel slug formatı: `{productId}-{slug}` — sifariş üçün product_id çıxarır. */
export function productIdFromCartSlug(slug: string | null | undefined): number | null {
  if (!slug || typeof slug !== 'string') return null;
  const idx = slug.indexOf('-');
  const prefix = idx >= 0 ? slug.slice(0, idx) : slug;
  const n = parseInt(prefix, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function addToCart(productId: number, quantity = 1): Promise<void> {
  await http.post(API_ENDPOINTS.MY_SHOPPING_CART_ADD, {
    product_id: productId,
    quantity,
  });
}

export async function removeCartLine(cartLineId: number): Promise<void> {
  await http.delete(API_ENDPOINTS.MY_SHOPPING_CART_CLEAR_ONE, {
    data: { id: cartLineId },
  });
}

export async function clearCart(): Promise<void> {
  await http.delete(API_ENDPOINTS.MY_SHOPPING_CART_CLEAR_ALL);
}

/** Aktiv bannerlər (JWT varsa şəxsi + ümumi) və server `meta`. */
export async function fetchBanners(): Promise<BannersFetchResult> {
  const { data } = await http.get<ApiEnvelope<BannerDto[]>>(API_ENDPOINTS.BANNERS);
  const list = data?.data ?? [];
  const metaRaw = data?.meta;
  const hasNew =
    metaRaw &&
    typeof metaRaw === 'object' &&
    metaRaw['has_new_special_offer_today'] === true;
  return {
    banners: list.filter((b) => b.status !== false),
    meta: { has_new_special_offer_today: Boolean(hasNew) },
  };
}

/** Giriş tələb olunur — tarix üzrə qruplaşdırılmış bildirişlər. */
export async function fetchMyNotifications(): Promise<NotificationsGroupedResponse> {
  const { data } = await http.get<ApiEnvelope<NotificationsGroupedResponse>>(
    API_ENDPOINTS.MY_NOTIFICATIONS,
  );
  return data?.data ?? {};
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
  const { data } = await http.post<Record<string, unknown>>(API_ENDPOINTS.MY_ORDERS, payload);
  const body = data ?? {};
  return {
    success: body.success === true,
    message: typeof body.message === 'string' ? body.message : undefined,
    order_id: typeof body.order_id === 'number' ? body.order_id : undefined,
  };
}
