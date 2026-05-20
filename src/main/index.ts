import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import {
  registerCacheImageProtocol,
  setupCacheImageProtocolHandler,
} from './cache-image-protocol';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import type { HttpIpcRequest, HttpIpcResponse } from '../shared/http-ipc';
import { toIpcCloneable } from '../shared/ipc-serialize';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import {
  buildLicenseFingerprintToken,
  DeviceFingerprintMismatchError,
  getFingerprintVersion,
  getLicenseDiagnostics,
  setLicenseEmail,
  verifyDeviceFingerprint,
} from './device-fingerprint';
import { checkInternetConnectivity } from './connectivity-check';
import { fetchPublicIpv4 } from './public-ip';
import { performHttpRequest } from './http-fetch';
import {
  ensureDesktopCacheDataDir,
  getAppDataCacheMeta,
  patchAppDataCachePartial,
  queryCachedProducts,
  readAppDataCacheFile,
  readDesktopCacheLite,
  searchProductsInMemory,
  writeAppDataCacheFile,
  writeDesktopCacheSnapshot,
} from './app-data-cache';
import { collectImageUrlsFromMemory, getProductsMemoryCount, reloadProductsFromDisk } from './desktop-cache-memory';
import type { DesktopCacheQuery, DesktopCacheSnapshot } from '../shared/desktop-cache';
import {
  appendHttpErrorLog,
  appendHttpRequestLog,
  appendHttpResponseLog,
  getLogsDirectory,
  openLogsDirectory,
  appendParseErrorLog,
} from './http-logger';
import type { AppDataBundle } from '../shared/app-data-cache';
import {
  cacheRemoteImages,
  rebuildImageCacheIndexFromDisk,
  resolveCachedImageUrl,
  resolveOrCacheImageUrl,
} from './image-cache';
import {
  checkForUpdatesManual,
  isAutoUpdateSupported,
  quitAndInstallUpdate,
  setupAutoUpdate,
} from './auto-update';

function loadEnvForMain(): void {
  const names = ['.env.development', '.env'];
  for (const name of names) {
    const p = join(process.cwd(), name);
    if (!existsSync(p)) continue;
    try {
      const text = readFileSync(p, 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const trimLine = line.trim();
        if (!trimLine || trimLine.startsWith('#')) continue;
        const eq = trimLine.indexOf('=');
        if (eq === -1) continue;
        const key = trimLine.slice(0, eq).trim();
        let val = trimLine.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (key === 'VITE_REST_API_ENDPOINT' && val && !process.env.VITE_REST_API_ENDPOINT?.trim()) {
          process.env.VITE_REST_API_ENDPOINT = val;
        }
        if (key === 'ELFIM_UPDATE_BASE_URL' && val && !process.env.ELFIM_UPDATE_BASE_URL?.trim()) {
          process.env.ELFIM_UPDATE_BASE_URL = val;
        }
        if (
          key === 'ELFIM_UPDATER_DEBUG' &&
          val &&
          process.env.ELFIM_UPDATER_DEBUG === undefined
        ) {
          process.env.ELFIM_UPDATER_DEBUG = val;
        }
      }
    } catch {
      /* ignore */
    }
  }
}

loadEnvForMain();
registerCacheImageProtocol();

let browserWindow: BrowserWindow | undefined;

const LICENSE_FP_HEADER = 'X-Elfim-License-Fingerprint';
const LICENSE_FP_VERSION_HEADER = 'X-Elfim-License-Fingerprint-Version';
/** Arxa planda cihaz izi yoxlaması (dəqiqə). */
const FINGERPRINT_POLL_MS = 60_000;

function preloadScriptPath(): string {
  const js = join(__dirname, '../preload/index.js');
  const mjs = join(__dirname, '../preload/index.mjs');
  if (existsSync(js)) return js;
  if (existsSync(mjs)) return mjs;
  return js;
}

/** Pəncərə çubuğu / tapşırıq paneli ikonu — renderer `public/data` ilə üst-üstə düşür. */
function resolveWindowIconPath(): string | undefined {
  const relativeBuilt = join(__dirname, '../renderer/data/icon-512x512.png');
  const devPublic = join(process.cwd(), 'src/renderer/public/data/icon-512x512.png');
  if (existsSync(relativeBuilt)) return relativeBuilt;
  if (existsSync(devPublic)) return devPublic;
  return undefined;
}

function createWindow(): void {
  const iconPath = resolveWindowIconPath();
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: 'Elfim Auto',
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: preloadScriptPath(),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  browserWindow = mainWindow;
  mainWindow.on('closed', () => {
    browserWindow = undefined;
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  /** Xarici keçidlər brauzerdə; `window.open` isə bloklanır (renderer çap iframe ilə edir). */
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

async function handleHttpRequest(payload: HttpIpcRequest): Promise<HttpIpcResponse> {
  const requestId = randomUUID();
  /** Disk IO renderer cavabını gözləməsin — əks halda böyük JSON + log yazılması IPC-i dondurur. */
  void appendHttpRequestLog(payload, requestId);

  let fpToken: string;
  try {
    fpToken = await buildLicenseFingerprintToken();
  } catch (err) {
    if (err instanceof DeviceFingerprintMismatchError) {
      return {
        ok: false,
        status: 403,
        statusText: 'Device Fingerprint Mismatch',
        data: { success: false, message: err.message },
        headers: {},
      };
    }
    fpToken = '';
  }
  const mergedHeaders: Record<string, string> = {
    ...payload.headers,
    ...(fpToken
      ? {
          [LICENSE_FP_HEADER]: fpToken,
          [LICENSE_FP_VERSION_HEADER]: getFingerprintVersion(),
        }
      : {}),
  };

  const req = { ...payload, headers: mergedHeaders };

  try {
    const out = await performHttpRequest(req);
    void appendHttpResponseLog(req, requestId, out);
    return toIpcCloneable(out) as HttpIpcResponse;
  } catch (err) {
    void appendHttpErrorLog(req, requestId, err);
    throw err;
  }
}

function getBrowserWindow(): BrowserWindow | undefined {
  if (browserWindow && !browserWindow.isDestroyed()) return browserWindow;
  return undefined;
}

function registerIpc(): void {
  /**
   * `removeHandler` istifadə etmirik: Electron əsas proses HMR / yenidən yükləmə zamanı
   * kanalı silib handler qeydiyyatsız qoya bilər; `handle` eyni kanalda köhnə handleri əvəz edir.
   */
  ipcMain.handle(IPC_CHANNELS.autoUpdateSupported, () => isAutoUpdateSupported());
  ipcMain.handle(IPC_CHANNELS.checkForUpdates, async () => {
    await checkForUpdatesManual();
  });
  ipcMain.handle(IPC_CHANNELS.quitAndInstallUpdate, () => {
    quitAndInstallUpdate();
  });
  ipcMain.handle(IPC_CHANNELS.ping, () => 'pong');
  ipcMain.handle(IPC_CHANNELS.httpRequest, (_event, payload: HttpIpcRequest) =>
    handleHttpRequest(payload),
  );
  ipcMain.handle(IPC_CHANNELS.setLicenseEmail, (_event, email: unknown) => {
    if (email == null || email === '') {
      setLicenseEmail(null);
      return Promise.resolve();
    }
    if (typeof email === 'string') {
      setLicenseEmail(email);
    }
    return Promise.resolve();
  });
  ipcMain.handle(IPC_CHANNELS.licenseDiagnostics, async () => toIpcCloneable(await getLicenseDiagnostics()));
  ipcMain.handle(IPC_CHANNELS.verifyDeviceFingerprint, () => verifyDeviceFingerprint());
  ipcMain.handle(IPC_CHANNELS.checkInternetConnectivity, () => checkInternetConnectivity());
  ipcMain.handle(IPC_CHANNELS.getPublicIp, () => fetchPublicIpv4());
  ipcMain.handle(IPC_CHANNELS.getLogsDirectory, () => getLogsDirectory());
  ipcMain.handle(IPC_CHANNELS.openLogsDirectory, () => openLogsDirectory());
  ipcMain.handle(
    IPC_CHANNELS.appendParseErrorLog,
    (_event, entry: { context: string; url?: string; message: string; payloadPreview?: string }) =>
      appendParseErrorLog(entry),
  );
  ipcMain.handle(IPC_CHANNELS.readAppDataCache, async () => toIpcCloneable(await readAppDataCacheFile()));
  ipcMain.handle(IPC_CHANNELS.writeAppDataCache, (_event, bundle: AppDataBundle) =>
    writeAppDataCacheFile(toIpcCloneable(bundle)),
  );
  ipcMain.handle(IPC_CHANNELS.patchAppDataCache, (_event, patch: Partial<AppDataBundle>) =>
    patchAppDataCachePartial(toIpcCloneable(patch)),
  );
  ipcMain.handle(IPC_CHANNELS.getAppDataCacheMeta, () => getAppDataCacheMeta());
  ipcMain.handle(IPC_CHANNELS.readDesktopCache, async () =>
    toIpcCloneable(await readDesktopCacheLite()),
  );
  ipcMain.handle(IPC_CHANNELS.writeDesktopCache, (_event, snapshot: DesktopCacheSnapshot) =>
    writeDesktopCacheSnapshot(toIpcCloneable(snapshot) as DesktopCacheSnapshot),
  );
  ipcMain.handle(IPC_CHANNELS.queryCachedProducts, (_event, query: DesktopCacheQuery) =>
    queryCachedProducts(query ?? {}),
  );
  ipcMain.handle(
    IPC_CHANNELS.searchCachedProductsOem,
    (
      _event,
      payload: {
        oemCode?: string;
        page?: number;
        pageSize?: number;
        categoryId?: number | null;
        shopId?: number | null;
      },
    ) => searchProductsInMemory(
      payload?.oemCode ?? '%%',
      payload?.page ?? 1,
      payload?.pageSize ?? 15,
      {
        categoryId: payload?.categoryId,
        shopId: payload?.shopId,
      },
    ),
  );
  ipcMain.handle(IPC_CHANNELS.getCachedProductCount, () => getProductsMemoryCount());
  ipcMain.handle(IPC_CHANNELS.reloadCachedProductsFromDisk, () => reloadProductsFromDisk());
  ipcMain.handle(IPC_CHANNELS.getCacheImageUrls, () => collectImageUrlsFromMemory());
  ipcMain.handle(IPC_CHANNELS.resolveCachedImage, (_event, remoteUrl: unknown) => {
    if (typeof remoteUrl !== 'string' || !remoteUrl.trim()) return null;
    return resolveCachedImageUrl(remoteUrl.trim());
  });
  ipcMain.handle(
    IPC_CHANNELS.resolveOrCacheImage,
    (_event, remoteUrl: unknown, allowDownload: unknown) => {
      if (typeof remoteUrl !== 'string' || !remoteUrl.trim()) return null;
      const download = allowDownload !== false;
      return resolveOrCacheImageUrl(remoteUrl.trim(), download);
    },
  );
  ipcMain.handle(IPC_CHANNELS.cacheImages, async (_event, urls: unknown) => {
    if (!Array.isArray(urls)) return { total: 0, cached: 0, skipped: 0, failed: 0 };
    const list = urls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
    try {
      const result = await cacheRemoteImages(list);
      void rebuildImageCacheIndexFromDisk();
      return result;
    } catch {
      return { total: list.length, cached: 0, skipped: 0, failed: list.length };
    }
  });
}

app.whenReady().then(async () => {
  setupCacheImageProtocolHandler();
  try {
    await ensureDesktopCacheDataDir();
  } catch (err) {
    console.error('[main] ensureDesktopCacheDataDir failed:', err);
  }
  registerIpc();
  void reloadProductsFromDisk();
  void rebuildImageCacheIndexFromDisk();

  electronApp.setAppUserModelId('io.elfim.desktop');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  setupAutoUpdate(getBrowserWindow);

  setInterval(() => {
    void verifyDeviceFingerprint();
  }, FINGERPRINT_POLL_MS);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
