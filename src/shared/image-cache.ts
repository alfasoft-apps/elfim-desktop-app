/** Məhsul və kataloq şəkilləri — `userData/cache/images/`. */

/**
 * JSON kataloq TTL-indən ayrı — əks halda hər sinxron zamanı köhnə indeks + qısa TTL
 * şəkilləri diskdən silir; oflaynda boş kartlar görünür.
 */
export const IMAGE_CACHE_TTL_MS = 180 * 24 * 60 * 60 * 1000;

export type ImageCacheIndexEntry = {
  remoteUrl: string;
  fileName: string;
  savedAt: number;
};

/** SHA-256 hex açarı → fayl meta. */
export type ImageCacheIndex = Record<string, ImageCacheIndexEntry>;

export type ImageCacheBatchResult = {
  total: number;
  cached: number;
  skipped: number;
  failed: number;
};
