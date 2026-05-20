import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import http from '../api/http';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ApiEnvelope } from '../api/types';
import type { CategoryItem, OrderSummary, ShopListItem, UserDto } from '../api/types';
import {
  APP_DATA_CACHE_TTL_MS,
  type CachedProductRecord,
  type DesktopCacheSnapshot,
  type DesktopBundleNotification,
  type AppDataCacheMeta,
} from '../types/app-data-cache';
import { fetchAllPaginatedProducts } from '../utils/fetch-all-pages';
import { processNewNotificationsFromBundle } from '../utils/desktop-notifications';
import { toIpcCloneable } from '../utils/ipc-serialize';
import {
  collectImageUrlsFromCache,
  productById,
  productsByCategoryId,
  productsByShopId,
} from '../utils/desktop-cache-query';
import { useNetworkStatusStore } from './networkStatus';
import { persistLastAccountFromUser } from '../utils/last-account-cache';

function envelopeData<T>(raw: unknown): T | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return raw as T;
  if (typeof raw === 'object' && 'data' in raw) {
    return (raw as ApiEnvelope<T>).data;
  }
  return raw as T;
}

function emptySnapshot(): DesktopCacheSnapshot {
  return {
    savedAt: 0,
    meta: { version: 2, savedAt: 0 },
    shops: [],
    categories: [],
    products: [],
    companyPhones: [],
    notifications: [],
    orderDetails: {},
  };
}

export const useAppDataCacheStore = defineStore('appDataCache', () => {
  const cache = ref<DesktopCacheSnapshot | null>(null);
  const savedAt = ref<number | null>(null);
  const syncing = ref(false);
  const syncProgress = ref(0);
  const syncLabel = ref('');
  const lastSyncError = ref<string | null>(null);
  const servingOffline = ref(false);
  const syncReady = ref(false);
  const diskReady = ref(false);
  let diskReadyResolve: (() => void) | null = null;
  const diskReadyPromise = new Promise<void>((resolve) => {
    diskReadyResolve = resolve;
  });

  function cachedProductCount(): number {
    const c = cache.value;
    if (!c) return 0;
    return c.meta?.productCount ?? c.products.length ?? 0;
  }

  /** Main prosesdə yüklənmiş məhsul sayı (IPC); meta ilə uyğunlaşdırmaq üçün. */
  const mainProductCount = ref<number | null>(null);

  const hasProductDiskCache = computed(() => {
    const fromMeta = cachedProductCount();
    const fromMain = mainProductCount.value ?? 0;
    return fromMeta > 0 || fromMain > 0;
  });

  /** Banner / UI üçün göstərici sayı. */
  const displayProductCount = computed(() =>
    Math.max(cachedProductCount(), mainProductCount.value ?? 0),
  );

  /** Son uğurlu məlumat mənbəyi — `fetchWithAppCache` və ya sync tamamlandıqda. */
  const lastFetchSource = ref<'network' | 'disk' | null>(null);
  const lastFetchAt = ref<number | null>(null);

  /** Backend `dbProductCount` ilə paket uzunluğu fərqlidirsə diaqnostika. */
  const bundleProductCountMismatch = computed(() => {
    const c = cache.value?.meta;
    if (!c?.dbProductCount || c.productCount == null) return false;
    return c.dbProductCount !== c.productCount;
  });

  const isValid = computed(() => {
    if (savedAt.value == null) return false;
    return Date.now() - savedAt.value < APP_DATA_CACHE_TTL_MS;
  });

  const hasCache = computed(
    () => cache.value != null && (cachedProductCount() > 0 || (cache.value?.shops?.length ?? 0) > 0),
  );

  const hasUsableCache = computed(() => {
    const c = cache.value;
    if (!c) return false;
    return (
      cachedProductCount() > 0 ||
      (Array.isArray(c.categories) && c.categories.length > 0) ||
      (Array.isArray(c.shops) && c.shops.length > 0)
    );
  });

  async function waitUntilDiskReady(): Promise<void> {
    if (diskReady.value) return;
    await diskReadyPromise;
  }

  function markDiskReady(): void {
    if (diskReady.value) return;
    diskReady.value = true;
    diskReadyResolve?.();
    diskReadyResolve = null;
  }

  async function refreshMainProductCount(): Promise<void> {
    if (typeof window.elfim?.getCachedProductCount !== 'function') {
      mainProductCount.value = null;
      return;
    }
    try {
      mainProductCount.value = await window.elfim.getCachedProductCount();
    } catch {
      mainProductCount.value = null;
    }
  }

  function recordFetchSource(source: 'network' | 'disk' | null): void {
    lastFetchSource.value = source;
    lastFetchAt.value = source != null ? Date.now() : null;
  }

  /** @deprecated — `cache` istifadə edin */
  const bundle = computed(() => cache.value);

  function applySnapshot(snap: DesktopCacheSnapshot): void {
    cache.value = snap;
    savedAt.value = snap.savedAt;
    syncReady.value =
      hasProductDiskCache.value ||
      (Array.isArray(snap.categories) && snap.categories.length > 0) ||
      (Array.isArray(snap.shops) && snap.shops.length > 0);
    servingOffline.value = false;

    const rawProfile = snap.profile;
    if (rawProfile && typeof rawProfile === 'object') {
      persistLastAccountFromUser(rawProfile as UserDto);
    }
  }

  async function loadFromDisk(): Promise<void> {
    try {
    if (typeof window.elfim?.readDesktopCache !== 'function') {
      if (typeof window.elfim?.readAppDataCache === 'function') {
        const legacy = await window.elfim.readAppDataCache();
        if (legacy?.bundle) {
          const products = (legacy.bundle.allProducts ?? []) as CachedProductRecord[];
          applySnapshot({
            ...emptySnapshot(),
            savedAt: legacy.savedAt,
            meta: { version: 2, savedAt: legacy.savedAt, productCount: products.length },
            shops: legacy.bundle.shops as unknown[],
            categories: legacy.bundle.categories as unknown[],
            products,
            companyPhones: legacy.bundle.companyPhones as unknown[],
            profile: legacy.bundle.profile,
            orders: legacy.bundle.orders as unknown[],
            orderDetails: legacy.bundle.orderDetails ?? {},
          });
        }
      }
      return;
    }
    try {
      const snap = await window.elfim.readDesktopCache();
      if (snap) applySnapshot(snap);
    } catch {
      /* ignore */
    }
    } finally {
      await refreshMainProductCount();
      markDiskReady();
    }
  }

  async function persistSnapshot(next: DesktopCacheSnapshot): Promise<void> {
    if (typeof window.elfim?.writeDesktopCache === 'function') {
      const written = await window.elfim.writeDesktopCache(toIpcCloneable(next));
      applySnapshot(written);
      await refreshMainProductCount();
      return;
    }
    if (typeof window.elfim?.writeAppDataCache === 'function') {
      const legacy = await window.elfim.writeAppDataCache(
        toIpcCloneable({
          categories: next.categories,
          shops: next.shops,
          allProducts: next.products,
          products: {
            all: { data: next.products, meta: { current_page: 1, last_page: 1, total: next.products.length } },
            new: { data: [] },
            popular: { data: [] },
            onsale: { data: [] },
          },
          shopProducts: {},
          companyPhones: next.companyPhones,
          profile: next.profile,
          orders: next.orders,
          orderDetails: next.orderDetails,
          generatedAt: next.meta.generatedAt,
        }),
      );
      applySnapshot({
        ...next,
        savedAt: legacy.savedAt,
      });
      await refreshMainProductCount();
    }
  }

  async function patchCache(patch: Partial<DesktopCacheSnapshot>): Promise<void> {
    const current = cache.value ?? emptySnapshot();
    const next: DesktopCacheSnapshot = {
      ...current,
      ...patch,
      products: patch.products ?? current.products,
      shops: patch.shops ?? current.shops,
      categories: patch.categories ?? current.categories,
      companyPhones: patch.companyPhones ?? current.companyPhones,
      notifications: patch.notifications ?? current.notifications ?? [],
      orderDetails: patch.orderDetails
        ? { ...(current.orderDetails ?? {}), ...patch.orderDetails }
        : current.orderDetails,
    };
    await persistSnapshot(next);
  }

  function setSyncStep(label: string, progress: number): void {
    syncLabel.value = label;
    syncProgress.value = Math.min(100, Math.max(0, progress));
  }

  async function syncBundleImages(): Promise<void> {
    if (typeof window.elfim?.cacheImages !== 'function' || !cache.value) return;
    let urls: string[] = [];
    if (typeof window.elfim.getCacheImageUrls === 'function') {
      try {
        urls = await window.elfim.getCacheImageUrls();
      } catch {
        urls = [];
      }
    }
    if (urls.length === 0) {
      urls = collectImageUrlsFromCache(cache.value);
    }
    if (urls.length === 0) return;

    const CHUNK = 40;
    for (let i = 0; i < urls.length; i += CHUNK) {
      const slice = urls.slice(i, i + CHUNK);
      const done = Math.min(i + slice.length, urls.length);
      setSyncStep(`Şəkillər keşlənir (${done}/${urls.length})`, 88 + Math.round((done / urls.length) * 11));
      try {
        await window.elfim.cacheImages(slice);
      } catch {
        /* şəkil keşi uğursuz — JSON keş işləyir */
      }
    }
  }

  function snapshotFromApiBody(body: unknown): DesktopCacheSnapshot | null {
    if (!body || typeof body !== 'object') return null;
    const root = body as Record<string, unknown>;
    const inner = (root.data ?? root) as Record<string, unknown>;
    if (!inner || typeof inner !== 'object') return null;

    const products = Array.isArray(inner.products)
      ? (inner.products as CachedProductRecord[])
      : Array.isArray(inner.allProducts)
        ? (inner.allProducts as CachedProductRecord[])
        : [];

    const meta = (inner.meta as Record<string, unknown>) ?? {};
    return {
      savedAt: Date.now(),
      meta: {
        version: 2,
        savedAt: Date.now(),
        generatedAt: typeof inner.generatedAt === 'string' ? inner.generatedAt : undefined,
        productCount: products.length,
        shopCount: Array.isArray(inner.shops) ? inner.shops.length : 0,
        categoryCount: Array.isArray(inner.categories) ? inner.categories.length : 0,
        ...meta,
      },
      shops: (inner.shops as unknown[]) ?? [],
      categories: (inner.categories as unknown[]) ?? [],
      products,
      companyPhones: (inner.companyPhones as unknown[]) ?? [],
      profile: inner.profile,
      orders: (inner.orders as unknown[]) ?? [],
      notifications: normalizeBundleNotifications(inner.notifications),
      orderDetails: cache.value?.orderDetails ?? {},
    };
  }

  function normalizeBundleNotifications(raw: unknown): DesktopBundleNotification[] {
    if (!Array.isArray(raw)) return [];
    const out: DesktopBundleNotification[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === 'string' ? o.id : null;
      if (!id) continue;
      out.push({
        id,
        read_at: typeof o.read_at === 'string' ? o.read_at : o.read_at === null ? null : undefined,
        created_at: typeof o.created_at === 'string' ? o.created_at : undefined,
        data:
          o.data && typeof o.data === 'object'
            ? (o.data as DesktopBundleNotification['data'])
            : undefined,
      });
    }
    return out;
  }

  async function syncBundleIncremental(): Promise<boolean> {
    const token = localStorage.getItem('auth_token');
    const snap = cache.value ?? emptySnapshot();

    setSyncStep('Kateqoriyalar', 10);
    const { data: catRes } = await http.get<ApiEnvelope<CategoryItem[]>>(API_ENDPOINTS.CATEGORIES);
    snap.categories = catRes?.data ?? [];

    setSyncStep('Mağazalar', 20);
    const { data: shopRes } = await http.get<ApiEnvelope<ShopListItem[]>>(
      API_ENDPOINTS.MANUFACTURING_FIRMS,
    );
    snap.shops = shopRes?.data ?? [];

    setSyncStep('Məhsullar', 30);
    const all = await fetchAllPaginatedProducts(API_ENDPOINTS.PRODUCTS, (p, lp) => {
      setSyncStep(`Məhsullar (${p}/${lp})`, 30 + Math.round((p / Math.max(lp, 1)) * 40));
    });
    snap.products = all.data as CachedProductRecord[];

    setSyncStep('Əlaqə', 75);
    const { data: phones } = await http.get(API_ENDPOINTS.COMPANY_PHONE_NUMBERS);
    snap.companyPhones = envelopeData<unknown[]>(phones) ?? [];

    if (token) {
      setSyncStep('Profil', 80);
      const { data: me } = await http.get<ApiEnvelope<UserDto>>(API_ENDPOINTS.ME);
      snap.profile = me?.data ?? null;

      setSyncStep('Sifarişlər', 85);
      const { data: ord } = await http.get<unknown>(API_ENDPOINTS.MY_ORDERS);
      const root = ord as Record<string, unknown>;
      snap.orders = Array.isArray(root?.data) ? (root.data as OrderSummary[]) : [];
    } else {
      snap.notifications = [];
    }

    await persistSnapshot(snap);
    await syncBundleImages();

    if (token) {
      try {
        const { data } = await http.get<ApiEnvelope<Record<string, unknown>>>(
          API_ENDPOINTS.MY_NOTIFICATIONS,
        );
        const grouped = data?.data ?? {};
        const flat: DesktopBundleNotification[] = [];
        for (const arr of Object.values(grouped)) {
          if (!Array.isArray(arr)) continue;
          for (const row of arr) {
            if (!row || typeof row !== 'object') continue;
            const r = row as Record<string, unknown>;
            const id = typeof r.id === 'string' ? r.id : null;
            if (!id) continue;
            flat.push({
              id,
              read_at: typeof r.read_at === 'string' ? r.read_at : r.read_at === null ? null : undefined,
              created_at: typeof r.created_at === 'string' ? r.created_at : undefined,
              data:
                r.data && typeof r.data === 'object'
                  ? (r.data as DesktopBundleNotification['data'])
                  : undefined,
            });
          }
        }
        flat.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
        const trimmed = flat.slice(0, 40);
        await patchCache({ notifications: trimmed });
        processNewNotificationsFromBundle(trimmed);
      } catch {
        /* bildirişlər alınmadı */
      }
    }

    setSyncStep('Keş hazırdır', 100);
    recordFetchSource('network');
    return true;
  }

  async function syncBundle(force = false): Promise<boolean> {
    const network = useNetworkStatusStore();
    if (!network.isOnline) {
      syncReady.value = hasProductDiskCache.value || hasUsableCache.value;
      return hasProductDiskCache.value || hasUsableCache.value;
    }
    if (syncing.value) return hasProductDiskCache.value || hasUsableCache.value;

    if (!force && isValid.value && hasUsableCache.value) {
      syncReady.value = true;
      return true;
    }

    syncing.value = true;
    lastSyncError.value = null;
    setSyncStep('JSON keş yüklənir…', 10);

    try {
      const { data } = await http.get<ApiEnvelope<Record<string, unknown>>>(
        `${API_ENDPOINTS.DESKTOP_APP_BUNDLE}?paginate=100`,
        { timeout: 600000 },
      );
      const snap = snapshotFromApiBody(data);
      if (!snap || snap.products.length === 0) {
        throw new Error('Keş formatı yanlışdır və ya məhsul siyahısı boşdur');
      }
      setSyncStep('Fayllara yazılır…', 70);
      await persistSnapshot(snap);
      processNewNotificationsFromBundle(snap.notifications);
      setSyncStep('Şəkillər', 85);
      await syncBundleImages();
      setSyncStep('Keş hazırdır', 100);
      recordFetchSource('network');
      return true;
    } catch (bundleErr) {
      try {
        setSyncStep('Addım-addım keşlənir…', 20);
        await syncBundleIncremental();
        return true;
      } catch (incErr) {
        lastSyncError.value =
          incErr instanceof Error
            ? incErr.message
            : bundleErr instanceof Error
              ? bundleErr.message
              : 'Keş yenilənmədi.';
        syncReady.value = hasProductDiskCache.value || hasUsableCache.value;
        return hasProductDiskCache.value || hasUsableCache.value;
      }
    } finally {
      syncing.value = false;
      window.setTimeout(() => {
        if (!syncing.value && syncProgress.value >= 100) {
          syncLabel.value = '';
          syncProgress.value = 0;
        }
      }, 1500);
    }
  }

  function useOfflineServing(): void {
    servingOffline.value = true;
  }

  async function getMeta(): Promise<AppDataCacheMeta> {
    if (typeof window.elfim?.getAppDataCacheMeta === 'function') {
      return window.elfim.getAppDataCacheMeta();
    }
    return {
      savedAt: savedAt.value,
      expiresAt: savedAt.value != null ? savedAt.value + APP_DATA_CACHE_TTL_MS : null,
      isValid: isValid.value,
      hasCache: hasCache.value,
      productCount: cachedProductCount(),
    };
  }

  function filterProductsByShopId(shopId: number) {
    return productsByShopId(cache.value, shopId);
  }

  function filterProductsByCategoryId(categoryId: number) {
    return productsByCategoryId(cache.value, categoryId);
  }

  function getProductById(id: number) {
    return productById(cache.value, id);
  }

  return {
    cache,
    bundle,
    filterProductsByShopId,
    filterProductsByCategoryId,
    getProductById,
    savedAt,
    syncing,
    syncProgress,
    syncLabel,
    lastSyncError,
    servingOffline,
    syncReady,
    diskReady,
    waitUntilDiskReady,
    mainProductCount,
    hasProductDiskCache,
    displayProductCount,
    lastFetchSource,
    lastFetchAt,
    bundleProductCountMismatch,
    refreshMainProductCount,
    recordFetchSource,
    isValid,
    hasCache,
    hasUsableCache,
    loadFromDisk,
    syncBundle,
    patchCache,
    /** @deprecated */
    patchBundle: patchCache,
    useOfflineServing,
    getMeta,
  };
});
