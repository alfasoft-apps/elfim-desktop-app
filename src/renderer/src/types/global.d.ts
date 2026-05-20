import type { ElectronAPI } from '@electron-toolkit/preload';
import type { AppDataBundle, AppDataCacheFile, AppDataCacheMeta } from './app-data-cache';
import type {
  CachedProductRecord,
  DesktopCacheQuery,
  DesktopCacheSnapshot,
} from './app-data-cache';
import type { LicenseDiagnostics } from './license-diagnostics';
import type { AutoUpdateStatus } from './auto-update-status';
import type { ImageCacheBatchResult } from '../../../shared/image-cache';

/** Mirror `src/shared/http-ipc.ts` — renderer TS layihəsi `shared`-i kompilyasiya etmir (composite TS6305). */
export type HttpIpcRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | null;
};

export type HttpIpcResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  data: unknown;
  headers: Record<string, string>;
};

export interface ElfimBridge {
  ping: () => Promise<string>;
  platform: NodeJS.Platform;
  httpRequest: (req: HttpIpcRequest) => Promise<HttpIpcResponse>;
  /** JWT müştəri e-poçtu — main prosesdə lisenziya izi ilə birləşdirilir. */
  setLicenseEmail: (email: string | null) => Promise<void>;
  getLicenseDiagnostics: () => Promise<LicenseDiagnostics>;
  verifyDeviceFingerprint: () => Promise<{ ok: true } | { ok: false; message: string }>;
  checkInternetConnectivity: () => Promise<boolean>;
  /** İctimai IPv4 (api.ipify.org) — uğursuz olsa `null`. */
  getPublicIp: () => Promise<string | null>;
  getLogsDirectory: () => Promise<string>;
  openLogsDirectory: () => Promise<string>;
  appendParseErrorLog: (entry: {
    context: string;
    url?: string;
    message: string;
    payloadPreview?: string;
  }) => Promise<void>;
  readAppDataCache: () => Promise<AppDataCacheFile | null>;
  writeAppDataCache: (bundle: AppDataBundle) => Promise<AppDataCacheFile>;
  patchAppDataCache: (patch: Partial<AppDataBundle>) => Promise<AppDataCacheFile | null>;
  getAppDataCacheMeta: () => Promise<AppDataCacheMeta>;
  readDesktopCache: () => Promise<DesktopCacheSnapshot | null>;
  writeDesktopCache: (snapshot: DesktopCacheSnapshot) => Promise<DesktopCacheSnapshot>;
  queryCachedProducts: (query: DesktopCacheQuery) => Promise<CachedProductRecord[]>;
  searchCachedProductsOem: (payload: {
    oemCode?: string;
    page?: number;
    pageSize?: number;
    categoryId?: number | null;
    shopId?: number | null;
  }) => Promise<{
    data: CachedProductRecord[];
    meta: { current_page: number; last_page: number; total: number };
  }>;
  getCacheImageUrls: () => Promise<string[]>;
  getCachedProductCount: () => Promise<number>;
  reloadCachedProductsFromDisk: () => Promise<number>;
  resolveCachedImage: (remoteUrl: string) => Promise<string | null>;
  resolveOrCacheImage: (remoteUrl: string, allowDownload?: boolean) => Promise<string | null>;
  cacheImages: (urls: string[]) => Promise<ImageCacheBatchResult>;
  isAutoUpdateSupported: () => Promise<boolean>;
  checkForUpdates: () => Promise<void>;
  quitAndInstallUpdate: () => Promise<void>;
  onUpdateStatus: (handler: (status: AutoUpdateStatus) => void) => () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    elfim: ElfimBridge;
  }
}

export {};
