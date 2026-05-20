export {
  ensureDesktopCacheDataDir,
  readAppDataCacheFile,
  writeAppDataCacheFile,
  patchAppDataCachePartial,
  getDesktopCacheMeta as getAppDataCacheMeta,
  readDesktopCacheLite,
  writeDesktopCacheSnapshot,
  patchDesktopCachePartial,
  queryCachedProducts,
  filterProducts,
  searchProductsInMemory,
} from './desktop-cache-files';

export { APP_DATA_CACHE_TTL_MS } from '../shared/desktop-cache';
