/**
 * Platform-aware electron-builder wrapper.
 * - Windows: NSIS only (macOS cannot be built on Windows).
 * - macOS: DMG + ZIP and Windows NSIS in one run.
 * For both platforms from a Windows dev machine, use GitHub Actions:
 *   .github/workflows/build-desktop.yml
 */
import { spawnSync } from 'node:child_process';
import { platform } from 'node:os';

const publish = process.argv.includes('--publish');
const plat = platform();

/** @type {string[]} */
const builderArgs = ['electron-builder'];

if (plat === 'darwin') {
  builderArgs.push('--mac', '--win');
  console.info('[build:all] macOS + Windows installers');
} else if (plat === 'win32') {
  builderArgs.push('--win');
  console.warn(
    '[build:all] Windows only — macOS DMG must be built on a Mac or via GitHub Actions:\n' +
      '  Actions → "Build desktop (Windows + macOS)" → Run workflow\n' +
      '  https://github.com/alfasoft-apps/elfim-desktop-app/actions',
  );
} else {
  console.error(`[build:all] Unsupported OS: ${plat}. Use GitHub Actions.`);
  process.exit(1);
}

if (publish) {
  builderArgs.push('--publish', 'always');
}

const env = {
  ...process.env,
  CSC_IDENTITY_AUTO_DISCOVERY: 'false',
};

const result = spawnSync('npx', builderArgs, {
  stdio: 'inherit',
  env,
  shell: true,
});

process.exit(result.status ?? 1);
