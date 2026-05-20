import { mkdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';
import {
  APP_DATA_CACHE_TTL_MS,
  DESKTOP_CACHE_FILES,
  DESKTOP_CACHE_VERSION,
  type CachedProductRecord,
  type DesktopCacheMeta,
  type DesktopCacheQuery,
  type DesktopCacheSnapshot,
  type AppDataCacheMeta,
} from '../shared/desktop-cache';
import type { AppDataBundle } from '../shared/app-data-cache';
import {
  getProductsMemoryCount,
  reloadProductsFromDisk,
  searchProductsInMemory,
  setCacheDataDirResolver,
  setProductsMemory,
  type CachedSearchFilters,
} from './desktop-cache-memory';

/** `userData/cache/data` — ara komponentlər və təsadüfi `cache` faylı (ENOTDIR/ENOENT) üçün möhkəmdir. */
export async function ensureDesktopCacheDataDir(): Promise<string> {
  if (!app.isReady()) {
    await app.whenReady();
  }
  const root = app.getPath('userData');
  const cacheDir = join(root, 'cache');
  const dataDir = join(cacheDir, 'data');

  await mkdir(root, { recursive: true });

  try {
    const st = await stat(cacheDir);
    if (!st.isDirectory()) {
      await unlink(cacheDir);
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== 'ENOENT') throw err;
  }

  await mkdir(cacheDir, { recursive: true });

  try {
    const stData = await stat(dataDir);
    if (!stData.isDirectory()) {
      await unlink(dataDir);
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== 'ENOENT') throw err;
  }

  await mkdir(dataDir, { recursive: true });
  return dataDir;
}

async function filePath(name: string): Promise<string> {
  return join(await ensureDesktopCacheDataDir(), name);
}

async function readJsonFile<T>(name: string, fallback: T): Promise<T> {
  try {
    const text = await readFile(await filePath(name), 'utf8');
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(name: string, data: unknown): Promise<void> {
  await writeFile(await filePath(name), JSON.stringify(data), 'utf8');
}

export function asProducts(raw: unknown): CachedProductRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is CachedProductRecord => p != null && typeof p === 'object' && 'id' in p);
}

function productIdFromSlug(slug: string): number | null {
  const trimmed = slug.trim();
  const idx = trimmed.indexOf('-');
  const prefix = idx >= 0 ? trimmed.slice(0, idx) : trimmed;
  const n = parseInt(prefix, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function matchesCategory(p: CachedProductRecord, categoryId: number): boolean {
  return (
    p.category_id_1 === categoryId ||
    p.category_id_2 === categoryId ||
    p.category_id_3 === categoryId
  );
}

export function filterProducts(
  products: CachedProductRecord[],
  query: DesktopCacheQuery,
): CachedProductRecord[] {
  let list = products;

  if (query.id != null) {
    list = list.filter((p) => p.id === query.id);
  }
  if (query.shopId != null) {
    list = list.filter((p) => p.shop_id === query.shopId);
  }
  if (query.categoryId != null) {
    list = list.filter((p) => matchesCategory(p, query.categoryId!));
  }
  if (query.productType?.trim()) {
    const t = query.productType.trim().toLowerCase();
    list = list.filter((p) => String(p.product_type ?? '').toLowerCase().includes(t));
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

/** Renderer üçün — məhsul massivi IPC ilə ötürülmür (yaddaşda main prosesdə qalır). */
export async function readDesktopCacheLite(): Promise<DesktopCacheSnapshot | null> {
  try {
    let meta = await readJsonFile<DesktopCacheMeta | null>(DESKTOP_CACHE_FILES.meta, null);
    const productCount = await reloadProductsFromDisk();

    if (!meta || typeof meta.savedAt !== 'number') {
      if (productCount === 0) return null;
      meta = {
        version: DESKTOP_CACHE_VERSION,
        savedAt: Date.now(),
        productCount,
      };
    }

    const [shops, categories, companyPhones, profile, orders, orderDetails] = await Promise.all([
      readJsonFile(DESKTOP_CACHE_FILES.shops, []),
      readJsonFile(DESKTOP_CACHE_FILES.categories, []),
      readJsonFile(DESKTOP_CACHE_FILES.companyPhones, []),
      readJsonFile(DESKTOP_CACHE_FILES.profile, null),
      readJsonFile(DESKTOP_CACHE_FILES.orders, []),
      readJsonFile<Record<string, unknown>>(DESKTOP_CACHE_FILES.orderDetails, {}),
    ]);

    return {
      savedAt: meta.savedAt,
      meta: { ...meta, productCount: productCount || meta.productCount },
      shops,
      categories,
      products: [],
      companyPhones,
      profile,
      orders,
      orderDetails,
    };
  } catch {
    return null;
  }
}

export async function readDesktopCacheSnapshot(): Promise<DesktopCacheSnapshot | null> {
  const lite = await readDesktopCacheLite();
  if (!lite) return null;
  const { ensureProductsMemory } = await import('./desktop-cache-memory');
  return { ...lite, products: await ensureProductsMemory() };
}

export async function writeDesktopCacheSnapshot(snapshot: DesktopCacheSnapshot): Promise<DesktopCacheSnapshot> {
  const savedAt = Date.now();
  const meta: DesktopCacheMeta = {
    version: DESKTOP_CACHE_VERSION,
    savedAt,
    generatedAt: snapshot.meta?.generatedAt,
    productCount: snapshot.products.length,
    shopCount: Array.isArray(snapshot.shops) ? snapshot.shops.length : 0,
    categoryCount: Array.isArray(snapshot.categories) ? snapshot.categories.length : 0,
  };

  const existing = await readDesktopCacheSnapshot();
  const orderDetails = {
    ...(existing?.orderDetails ?? {}),
    ...(snapshot.orderDetails ?? {}),
  };

  await Promise.all([
    writeJsonFile(DESKTOP_CACHE_FILES.meta, meta),
    writeJsonFile(DESKTOP_CACHE_FILES.shops, snapshot.shops ?? []),
    writeJsonFile(DESKTOP_CACHE_FILES.categories, snapshot.categories ?? []),
    writeJsonFile(DESKTOP_CACHE_FILES.products, snapshot.products ?? []),
    writeJsonFile(DESKTOP_CACHE_FILES.companyPhones, snapshot.companyPhones ?? []),
    writeJsonFile(DESKTOP_CACHE_FILES.profile, snapshot.profile ?? null),
    writeJsonFile(DESKTOP_CACHE_FILES.orders, snapshot.orders ?? []),
    writeJsonFile(DESKTOP_CACHE_FILES.orderDetails, orderDetails),
  ]);

  setProductsMemory(snapshot.products ?? []);

  return {
    ...snapshot,
    savedAt,
    meta,
    orderDetails,
    products: [],
  };
}

export async function patchDesktopCachePartial(
  patch: Partial<Omit<DesktopCacheSnapshot, 'savedAt' | 'meta'>>,
): Promise<DesktopCacheSnapshot | null> {
  const existing = await readDesktopCacheSnapshot();
  if (!existing && !patch.categories && !patch.shops && !patch.products) {
    return null;
  }

  const base = existing ?? {
    savedAt: Date.now(),
    meta: { version: DESKTOP_CACHE_VERSION, savedAt: Date.now() },
    shops: [],
    categories: [],
    products: [],
    companyPhones: [],
  };

  return writeDesktopCacheSnapshot({
    ...base,
    shops: patch.shops ?? base.shops,
    categories: patch.categories ?? base.categories,
    products: patch.products ?? base.products,
    companyPhones: patch.companyPhones ?? base.companyPhones,
    profile: patch.profile !== undefined ? patch.profile : base.profile,
    orders: patch.orders !== undefined ? patch.orders : base.orders,
    orderDetails: patch.orderDetails
      ? { ...(base.orderDetails ?? {}), ...patch.orderDetails }
      : base.orderDetails,
    meta: base.meta,
  });
}

export async function queryCachedProducts(query: DesktopCacheQuery): Promise<CachedProductRecord[]> {
  const { ensureProductsMemory } = await import('./desktop-cache-memory');
  return filterProducts(await ensureProductsMemory(), query);
}

export async function getDesktopCacheMeta(): Promise<AppDataCacheMeta> {
  const lite = await readDesktopCacheLite();
  if (!lite) {
    return { savedAt: null, expiresAt: null, isValid: false, hasCache: false };
  }
  const productCount = lite.meta.productCount ?? getProductsMemoryCount();
  const expiresAt = lite.savedAt + APP_DATA_CACHE_TTL_MS;
  return {
    savedAt: lite.savedAt,
    expiresAt,
    isValid: Date.now() < expiresAt,
    hasCache: productCount > 0,
    productCount,
  };
}

/** Köhnə vahid `app-data-cache.json` API uyğunluğu (renderer keçidi). */
export async function readAppDataCacheFile(): Promise<{
  savedAt: number;
  bundle: AppDataBundle;
} | null> {
  const snap = await readDesktopCacheSnapshot();
  if (!snap) return null;
  return {
    savedAt: snap.savedAt,
    bundle: snapshotToLegacyBundle(snap),
  };
}

export async function writeAppDataCacheFile(
  bundle: AppDataBundle,
): Promise<{ savedAt: number; bundle: AppDataBundle }> {
  const written = await writeDesktopCacheSnapshot(legacyBundleToSnapshot(bundle));
  return { savedAt: written.savedAt, bundle: snapshotToLegacyBundle(written) };
}

export async function patchAppDataCachePartial(
  patch: Partial<AppDataBundle>,
): Promise<{ savedAt: number; bundle: AppDataBundle } | null> {
  const written = await patchDesktopCachePartial(legacyPatchToSnapshot(patch));
  if (!written) return null;
  return { savedAt: written.savedAt, bundle: snapshotToLegacyBundle(written) };
}

function snapshotToLegacyBundle(snap: DesktopCacheSnapshot): AppDataBundle {
  return {
    categories: snap.categories,
    shops: snap.shops,
    allProducts: snap.products,
    products: {
      all: { data: snap.products, meta: { current_page: 1, last_page: 1, total: snap.products.length } },
      new: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } },
      popular: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } },
      onsale: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } },
    },
    shopProducts: {},
    companyPhones: snap.companyPhones,
    profile: snap.profile,
    orders: snap.orders,
    meta: {
      productCount: snap.meta.productCount,
      shopCount: snap.meta.shopCount,
      categoryCount: snap.meta.categoryCount,
    },
    generatedAt: snap.meta.generatedAt,
    productDetails: {},
    orderDetails: snap.orderDetails ?? {},
  };
}

function legacyBundleToSnapshot(bundle: AppDataBundle): DesktopCacheSnapshot {
  const products = Array.isArray(bundle.allProducts)
    ? (bundle.allProducts as CachedProductRecord[])
    : [];

  return {
    savedAt: Date.now(),
    meta: {
      version: DESKTOP_CACHE_VERSION,
      savedAt: Date.now(),
      generatedAt: bundle.generatedAt,
    },
    shops: Array.isArray(bundle.shops) ? bundle.shops : [],
    categories: Array.isArray(bundle.categories) ? bundle.categories : [],
    products,
    companyPhones: Array.isArray(bundle.companyPhones) ? bundle.companyPhones : [],
    profile: bundle.profile,
    orders: Array.isArray(bundle.orders) ? bundle.orders : [],
    orderDetails: bundle.orderDetails ?? {},
  };
}

function legacyPatchToSnapshot(
  patch: Partial<AppDataBundle>,
): Partial<Omit<DesktopCacheSnapshot, 'savedAt' | 'meta'>> {
  const out: Partial<Omit<DesktopCacheSnapshot, 'savedAt' | 'meta'>> = {};
  if (patch.categories !== undefined) out.categories = patch.categories as unknown[];
  if (patch.shops !== undefined) out.shops = patch.shops as unknown[];
  if (patch.allProducts !== undefined) out.products = patch.allProducts as CachedProductRecord[];
  const patchProducts = (patch as { products?: CachedProductRecord[] }).products;
  if (Array.isArray(patchProducts)) out.products = patchProducts;
  if (patch.companyPhones !== undefined) out.companyPhones = patch.companyPhones as unknown[];
  if (patch.profile !== undefined) out.profile = patch.profile;
  if (patch.orders !== undefined) out.orders = patch.orders as unknown[];
  if (patch.orderDetails !== undefined) out.orderDetails = patch.orderDetails;
  return out;
}

setCacheDataDirResolver(ensureDesktopCacheDataDir);

export { searchProductsInMemory, type CachedSearchFilters };
