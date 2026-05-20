import { app, BrowserWindow } from 'electron';
// CJS package — `import { autoUpdater }` breaks at runtime under ESM output (Electron main).
import electronUpdater from 'electron-updater';

const { autoUpdater } = electronUpdater;
import type { AutoUpdateStatus } from '../shared/auto-update-status';
import { IPC_CHANNELS } from '../shared/ipc-channels';

function isPortableExecution(): boolean {
  return Boolean(process.env.PORTABLE_EXECUTABLE_DIR || process.env.PORTABLE_EXECUTABLE_FILE);
}

export function isAutoUpdateSupported(): boolean {
  return app.isPackaged && !isPortableExecution();
}

function sendStatus(getWindow: () => BrowserWindow | undefined, status: AutoUpdateStatus): void {
  const win = getWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.updateStatus, status);
  }
}

let listenersAttached = false;

export function setupAutoUpdate(getWindow: () => BrowserWindow | undefined): void {
  if (!isAutoUpdateSupported()) return;

  if (
    process.env.ELFIM_UPDATER_DEBUG === '1' ||
    process.env.ELFIM_UPDATER_DEBUG === 'true'
  ) {
    autoUpdater.logger = console;
    console.info('[autoUpdater] debug logging on');
  }

  const override = process.env.ELFIM_UPDATE_BASE_URL?.trim();
  /** Generic HTTPS feed — when set in `.env`, overrides baked-in GitHub `publish` (e.g. staging). */
  if (override) {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: override.endsWith('/') ? override : `${override}/`,
    });
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  if (!listenersAttached) {
    listenersAttached = true;

    autoUpdater.on('checking-for-update', () => {
      sendStatus(getWindow, { phase: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      sendStatus(getWindow, { phase: 'available', version: info.version });
      void autoUpdater.downloadUpdate().catch((err: unknown) => {
        sendStatus(getWindow, {
          phase: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      });
    });

    autoUpdater.on('update-not-available', () => {
      sendStatus(getWindow, { phase: 'not-available' });
    });

    autoUpdater.on('download-progress', (p) => {
      sendStatus(getWindow, {
        phase: 'downloading',
        percent: p.percent,
        transferred: p.transferred,
        total: p.total,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      sendStatus(getWindow, { phase: 'downloaded', version: info.version });
    });

    autoUpdater.on('error', (err) => {
      sendStatus(getWindow, {
        phase: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }

  const initialDelayMs = 5000;
  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch((err: unknown) => {
      sendStatus(getWindow, {
        phase: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }, initialDelayMs);

  const intervalMs = 6 * 60 * 60 * 1000;
  setInterval(() => {
    void autoUpdater.checkForUpdates().catch(() => {});
  }, intervalMs);
}

export async function checkForUpdatesManual(): Promise<void> {
  if (!isAutoUpdateSupported()) return;
  await autoUpdater.checkForUpdates();
}

export function quitAndInstallUpdate(): void {
  if (!isAutoUpdateSupported()) return;
  autoUpdater.quitAndInstall(false, true);
}
