import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { app, BrowserWindow } from 'electron';
// CJS package — `import { autoUpdater }` breaks at runtime under ESM output (Electron main).
import electronUpdater from 'electron-updater';

const { autoUpdater } = electronUpdater;
import type { AutoUpdateStatus } from '../shared/auto-update-status';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { appendUpdaterLog } from './http-logger';

const GITHUB_OWNER = 'alfasoft-apps';
const GITHUB_REPO = 'elfim-desktop-app';

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

function logUpdater(message: string, extra?: Record<string, unknown>): void {
  const line = `[autoUpdater] ${message}`;
  console.info(line);
  void appendUpdaterLog({ message, ...extra }).catch(() => {});
}

function configureUpdateFeed(): void {
  const override = process.env.ELFIM_UPDATE_BASE_URL?.trim();
  if (override) {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: override.endsWith('/') ? override : `${override}/`,
    });
    logUpdater(`feed=generic url=${override}`);
    return;
  }

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    releaseType: 'release',
  });
  logUpdater(`feed=github ${GITHUB_OWNER}/${GITHUB_REPO}`);
}

function logUpdaterStartup(): void {
  const configPath = join(process.resourcesPath, 'app-update.yml');
  const hasConfig = existsSync(configPath);
  logUpdater(`startup version=${app.getVersion()} packaged=${app.isPackaged}`, {
    hasAppUpdateYml: hasConfig,
    configPreview: hasConfig ? readFileSync(configPath, 'utf8').trim().slice(0, 200) : null,
  });
  if (!hasConfig) {
    logUpdater('warning: app-update.yml missing — using explicit GitHub feed');
  }
}

let listenersAttached = false;

export function setupAutoUpdate(getWindow: () => BrowserWindow | undefined): void {
  if (!isAutoUpdateSupported()) {
    logUpdater('disabled (not packaged or portable build)');
    return;
  }

  if (
    process.env.ELFIM_UPDATER_DEBUG === '1' ||
    process.env.ELFIM_UPDATER_DEBUG === 'true'
  ) {
    autoUpdater.logger = console;
  }

  configureUpdateFeed();
  logUpdaterStartup();

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  if (!listenersAttached) {
    listenersAttached = true;

    autoUpdater.on('checking-for-update', () => {
      logUpdater('checking');
      sendStatus(getWindow, { phase: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      logUpdater(`update-available remote=${info.version}`);
      sendStatus(getWindow, { phase: 'available', version: info.version });
      void autoUpdater.downloadUpdate().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        logUpdater(`download-failed ${message}`);
        sendStatus(getWindow, { phase: 'error', message });
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      logUpdater(`update-not-available current=${app.getVersion()} remote=${info?.version ?? 'n/a'}`);
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
      logUpdater(`update-downloaded version=${info.version}`);
      sendStatus(getWindow, { phase: 'downloaded', version: info.version });
    });

    autoUpdater.on('error', (err) => {
      const message = err instanceof Error ? err.message : String(err);
      logUpdater(`error ${message}`);
      sendStatus(getWindow, { phase: 'error', message });
    });
  }

  const initialDelayMs = 5000;
  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      logUpdater(`check-failed ${message}`);
      sendStatus(getWindow, { phase: 'error', message });
    });
  }, initialDelayMs);

  const intervalMs = 6 * 60 * 60 * 1000;
  setInterval(() => {
    void autoUpdater.checkForUpdates().catch(() => {});
  }, intervalMs);
}

export async function checkForUpdatesManual(): Promise<void> {
  if (!isAutoUpdateSupported()) return;
  logUpdater('manual check');
  await autoUpdater.checkForUpdates();
}

export function quitAndInstallUpdate(): void {
  if (!isAutoUpdateSupported()) return;
  autoUpdater.quitAndInstall(false, true);
}
