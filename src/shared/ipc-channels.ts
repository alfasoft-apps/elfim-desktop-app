/** IPC channels shared between main and preload (invoke/handle). */
export const IPC_CHANNELS = {
  ping: 'elfim:ping',
  /** Axios sorğuları main prosesdə icra olunur (Chromium CORS tətbiq olunmur). */
  httpRequest: 'elfim:http-request',
  /** JWT-dən çıxarılan müştəri e-poçtu — lisenziya izi tokenində istifadə olunur. */
  setLicenseEmail: 'elfim:set-license-email',
  /** Parametrlər səhifəsi üçün cihaz/lisenziya diaqnostikası (main proses). */
  licenseDiagnostics: 'elfim:license-diagnostics',
  verifyDeviceFingerprint: 'elfim:verify-device-fingerprint',
  /** Arxa planda internet çıxışını yoxlayır (connectivity check). */
  checkInternetConnectivity: 'elfim:check-internet-connectivity',
  /** Lisenziya səhifəsi — admin IP whitelist üçün ictimai IPv4. */
  getPublicIp: 'elfim:get-public-ip',
  getLogsDirectory: 'elfim:get-logs-directory',
  openLogsDirectory: 'elfim:open-logs-directory',
  appendParseErrorLog: 'elfim:append-parse-error-log',
  readAppDataCache: 'elfim:read-app-data-cache',
  writeAppDataCache: 'elfim:write-app-data-cache',
  patchAppDataCache: 'elfim:patch-app-data-cache',
  getAppDataCacheMeta: 'elfim:get-app-data-cache-meta',
  readDesktopCache: 'elfim:read-desktop-cache',
  writeDesktopCache: 'elfim:write-desktop-cache',
  queryCachedProducts: 'elfim:query-cached-products',
  searchCachedProductsOem: 'elfim:search-cached-products-oem',
  getCachedProductCount: 'elfim:get-cached-product-count',
  reloadCachedProductsFromDisk: 'elfim:reload-cached-products-from-disk',
  getCacheImageUrls: 'elfim:get-cache-image-urls',
  resolveCachedImage: 'elfim:resolve-cached-image',
  resolveOrCacheImage: 'elfim:resolve-or-cache-image',
  cacheImages: 'elfim:cache-images',
  /** Paketlənmiş quraşdırılmış build üçün avtomatik yeniləmə (NSIS). */
  autoUpdateSupported: 'elfim:auto-update-supported',
  checkForUpdates: 'elfim:check-for-updates',
  quitAndInstallUpdate: 'elfim:quit-and-install-update',
  /** Main → renderer (`webContents.send`); preload `ipcRenderer.on` ilə dinlənir. */
  updateStatus: 'elfim:update-status',
} as const;
