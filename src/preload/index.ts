import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import type { HttpIpcRequest, HttpIpcResponse } from '../shared/http-ipc';
import type { AppDataBundle, AppDataCacheFile, AppDataCacheMeta } from '../shared/app-data-cache';
import type {
  CachedProductRecord,
  DesktopCacheQuery,
  DesktopCacheSnapshot,
} from '../shared/desktop-cache';
import type { ImageCacheBatchResult } from '../shared/image-cache';
import type { LicenseDiagnostics } from '../shared/license-diagnostics';
import type { AutoUpdateStatus } from '../shared/auto-update-status';
import { IPC_CHANNELS } from '../shared/ipc-channels';

const elfimBridge = {
  ping: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.ping),
  platform: process.platform,
  httpRequest: (req: HttpIpcRequest): Promise<HttpIpcResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.httpRequest, req),
  setLicenseEmail: (email: string | null): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.setLicenseEmail, email),
  getLicenseDiagnostics: (): Promise<LicenseDiagnostics> =>
    ipcRenderer.invoke(IPC_CHANNELS.licenseDiagnostics),
  verifyDeviceFingerprint: (): Promise<{ ok: true } | { ok: false; message: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.verifyDeviceFingerprint),
  checkInternetConnectivity: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.checkInternetConnectivity),
  getPublicIp: (): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.getPublicIp),
  getLogsDirectory: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.getLogsDirectory),
  openLogsDirectory: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.openLogsDirectory),
  appendParseErrorLog: (entry: {
    context: string;
    url?: string;
    message: string;
    payloadPreview?: string;
  }): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.appendParseErrorLog, entry),
  readAppDataCache: (): Promise<AppDataCacheFile | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.readAppDataCache),
  writeAppDataCache: (bundle: AppDataBundle): Promise<AppDataCacheFile> =>
    ipcRenderer.invoke(IPC_CHANNELS.writeAppDataCache, bundle),
  patchAppDataCache: (patch: Partial<AppDataBundle>): Promise<AppDataCacheFile | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.patchAppDataCache, patch),
  getAppDataCacheMeta: (): Promise<AppDataCacheMeta> =>
    ipcRenderer.invoke(IPC_CHANNELS.getAppDataCacheMeta),
  readDesktopCache: (): Promise<DesktopCacheSnapshot | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.readDesktopCache),
  writeDesktopCache: (snapshot: DesktopCacheSnapshot): Promise<DesktopCacheSnapshot> =>
    ipcRenderer.invoke(IPC_CHANNELS.writeDesktopCache, snapshot),
  queryCachedProducts: (query: DesktopCacheQuery): Promise<CachedProductRecord[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.queryCachedProducts, query),
  searchCachedProductsOem: (payload: {
    oemCode?: string;
    page?: number;
    pageSize?: number;
    categoryId?: number | null;
    shopId?: number | null;
  }): Promise<{
    data: CachedProductRecord[];
    meta: { current_page: number; last_page: number; total: number };
  }> => ipcRenderer.invoke(IPC_CHANNELS.searchCachedProductsOem, payload),
  getCacheImageUrls: (): Promise<string[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.getCacheImageUrls),
  getCachedProductCount: (): Promise<number> =>
    ipcRenderer.invoke(IPC_CHANNELS.getCachedProductCount),
  reloadCachedProductsFromDisk: (): Promise<number> =>
    ipcRenderer.invoke(IPC_CHANNELS.reloadCachedProductsFromDisk),
  resolveCachedImage: (remoteUrl: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.resolveCachedImage, remoteUrl),
  resolveOrCacheImage: (remoteUrl: string, allowDownload = true): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.resolveOrCacheImage, remoteUrl, allowDownload),
  cacheImages: (urls: string[]): Promise<ImageCacheBatchResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.cacheImages, urls),
  isAutoUpdateSupported: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.autoUpdateSupported),
  checkForUpdates: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.checkForUpdates),
  quitAndInstallUpdate: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.quitAndInstallUpdate),
  onUpdateStatus: (handler: (status: AutoUpdateStatus) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: AutoUpdateStatus) =>
      handler(status);
    ipcRenderer.on(IPC_CHANNELS.updateStatus, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.updateStatus, listener);
  },
};

contextBridge.exposeInMainWorld('electron', electronAPI);
contextBridge.exposeInMainWorld('elfim', elfimBridge);
