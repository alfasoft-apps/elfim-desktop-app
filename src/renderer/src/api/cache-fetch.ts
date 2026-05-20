import { useAppDataCacheStore } from '../stores/appDataCache';
import { useNetworkStatusStore } from '../stores/networkStatus';

const OFFLINE_NO_CACHE =
  'Oflayn rejim — keşdə məlumat yoxdur. Əvvəlcə internetlə tətbiqi açıb keşin dolmasını gözləyin (siyahı və şəkillər doldurulana qədər).';

function isNetworkFailure(err: unknown): boolean {
  const ax = err as { code?: string; message?: string; response?: unknown };
  return (
    !ax.response &&
    (ax.code === 'ERR_NETWORK' ||
      ax.message === 'Network Error' ||
      ax.code === 'ECONNABORTED' ||
      (typeof ax.message === 'string' &&
        (ax.message.includes('İnternet') ||
          ax.message.includes('Serverə qoşulmaq') ||
          ax.message.includes('fetch failed'))))
  );
}

/** Onlayn görünür amma server əlçatan deyil — keşə keçməyə çalış. */
function shouldTryCacheAfterError(err: unknown): boolean {
  if (isNetworkFailure(err)) return true;
  const ax = err as { response?: unknown; code?: string; message?: string };
  if (ax.response) return false;
  const code = ax.code ?? '';
  const msg = typeof ax.message === 'string' ? ax.message : '';
  if (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND'
  ) {
    return true;
  }
  if (/502|503|504/i.test(msg)) return true;
  return false;
}

function offlineUnavailableMessage(cache: ReturnType<typeof useAppDataCacheStore>): string {
  if (cache.syncing) {
    return 'Keş hazırlanır, bir neçə saniyə gözləyin…';
  }
  if (!cache.hasProductDiskCache && cache.hasUsableCache) {
    return 'Oflayn rejim — məhsul keşi boşdur. İnternetlə tətbiqi açıb tam sinxron gözləyin.';
  }
  return OFFLINE_NO_CACHE;
}

/**
 * Onlayn: API + keş yenilə.
 * Oflayn / şəbəkə xətası: keşdən oxu (müddəti bitmiş olsa belə).
 */
export async function fetchWithAppCache<T>(
  online: () => Promise<T>,
  offline: () => T | Promise<T | undefined | null> | undefined | null,
): Promise<T> {
  const network = useNetworkStatusStore();
  const cache = useAppDataCacheStore();
  await cache.waitUntilDiskReady();

  const tryOffline = async (): Promise<T | null> => {
    const hit = await Promise.resolve(offline());
    if (hit !== undefined && hit !== null) {
      cache.useOfflineServing();
      cache.recordFetchSource('disk');
      return hit;
    }
    return null;
  };

  if (!network.isOnline) {
    const hit = await tryOffline();
    if (hit !== null) return hit;
    throw new Error(offlineUnavailableMessage(cache));
  }

  try {
    const result = await online();
    cache.recordFetchSource('network');
    return result;
  } catch (err) {
    if (shouldTryCacheAfterError(err)) {
      const hit = await tryOffline();
      if (hit !== null) return hit;
    }
    throw err;
  }
}

export { isNetworkFailure };
