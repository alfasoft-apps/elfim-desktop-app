import { createHash } from 'crypto';
import { access, mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';
import { app, net } from 'electron';
import { getApiBaseUrl } from '../shared/api-base';
import { imageUrlLookupKeys, resolveImageUrl } from '../shared/image-url';
import {
  IMAGE_CACHE_TTL_MS,
  type ImageCacheBatchResult,
  type ImageCacheIndex,
  type ImageCacheIndexEntry,
} from '../shared/image-cache';
import { toRendererCacheUrl } from './cache-image-protocol';

const INDEX_FILENAME = 'image-cache-index.json';
const IMAGES_SUBDIR = 'images';
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'] as const;

let indexLock: Promise<void> = Promise.resolve();

function withIndexLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = indexLock.then(fn, fn);
  indexLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Hər əməliyyatdan əvvəl `cache/images` qovluğunu yaradır. */
async function ensureImagesDir(): Promise<string> {
  const dir = join(app.getPath('userData'), 'cache', IMAGES_SUBDIR);
  await mkdir(dir, { recursive: true });
  return dir;
}

function indexPath(dir: string): string {
  return join(dir, INDEX_FILENAME);
}

function urlKey(remoteUrl: string): string {
  return createHash('sha256').update(remoteUrl).digest('hex');
}

function extFromUrl(remoteUrl: string): string {
  try {
    const pathname = new URL(remoteUrl).pathname;
    const m = pathname.match(/\.(jpe?g|png|gif|webp|avif|svg)(\?.*)?$/i);
    if (m) return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
  } catch {
    /* ignore */
  }
  return 'jpg';
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readIndex(): Promise<ImageCacheIndex> {
  const dir = await ensureImagesDir();
  const path = indexPath(dir);
  if (!(await fileExists(path))) {
    return {};
  }
  try {
    const text = await readFile(path, 'utf8');
    const parsed = JSON.parse(text) as ImageCacheIndex;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeIndexUnlocked(index: ImageCacheIndex): Promise<void> {
  const dir = await ensureImagesDir();
  await writeFile(indexPath(dir), JSON.stringify(index), 'utf8');
}

async function writeIndex(index: ImageCacheIndex): Promise<void> {
  return withIndexLock(() => writeIndexUnlocked(index));
}

function isEntryValid(entry: ImageCacheIndexEntry): boolean {
  return Date.now() - entry.savedAt < IMAGE_CACHE_TTL_MS;
}

function normalizeRemoteUrl(raw: string): string {
  const trimmed = raw.trim();
  return resolveImageUrl(trimmed, getApiBaseUrl()) ?? trimmed;
}

async function localPathForEntry(entry: ImageCacheIndexEntry): Promise<string | null> {
  const dir = await ensureImagesDir();
  const full = join(dir, entry.fileName);
  if (!(await fileExists(full))) return null;
  return toRendererCacheUrl(full);
}

function findIndexEntry(index: ImageCacheIndex, rawUrl: string): ImageCacheIndexEntry | null {
  const apiBase = getApiBaseUrl();
  for (const candidate of imageUrlLookupKeys(rawUrl, apiBase)) {
    const entry = index[urlKey(candidate)];
    if (entry && isEntryValid(entry)) return entry;
  }
  return null;
}

/** İndeks itirsə belə diskdə `{hash}.{ext}` faylını tapır. */
async function resolveFileOnDisk(rawUrl: string): Promise<string | null> {
  const dir = await ensureImagesDir();
  const apiBase = getApiBaseUrl();
  for (const candidate of imageUrlLookupKeys(rawUrl, apiBase)) {
    const key = urlKey(candidate);
    for (const ext of IMAGE_EXTENSIONS) {
      const full = join(dir, `${key}.${ext}`);
      if (await fileExists(full)) {
        return toRendererCacheUrl(full);
      }
    }
  }
  return null;
}

export async function resolveCachedImageUrl(remoteUrl: string): Promise<string | null> {
  const trimmed = remoteUrl?.trim();
  if (!trimmed) return null;

  const index = await readIndex();
  const entry = findIndexEntry(index, trimmed);
  if (entry) {
    const hit = await localPathForEntry(entry);
    if (hit) return hit;
  }

  return resolveFileOnDisk(trimmed);
}

/** Paralel yükləmədən sonra itmiş indeks sətirlərini diskdən bərpa edir. */
export async function rebuildImageCacheIndexFromDisk(): Promise<void> {
  return withIndexLock(async () => {
    const dir = await ensureImagesDir();
    const index = await readIndex();
    const names = await readdir(dir);
    let changed = false;
    const next: ImageCacheIndex = { ...index };

    for (const fileName of names) {
      if (fileName === INDEX_FILENAME) continue;
      const dot = fileName.lastIndexOf('.');
      if (dot <= 0) continue;
      const ext = fileName.slice(dot + 1).toLowerCase();
      if (!IMAGE_EXTENSIONS.includes(ext as (typeof IMAGE_EXTENSIONS)[number])) continue;

      const key = fileName.slice(0, dot);
      if (next[key]?.fileName === fileName) continue;

      const full = join(dir, fileName);
      if (!(await fileExists(full))) continue;

      next[key] = {
        remoteUrl: next[key]?.remoteUrl ?? '',
        fileName,
        savedAt: Date.now(),
      };
      changed = true;
    }

    if (changed) {
      await writeIndexUnlocked(next);
    }
  });
}

/** Keşdə varsa qaytarır; yoxdursa (onlayn) yükləyib saxlayır. */
export async function resolveOrCacheImageUrl(
  remoteUrl: string,
  allowDownload = true,
): Promise<string | null> {
  const trimmed = remoteUrl?.trim();
  if (!trimmed) return null;

  const cached = await resolveCachedImageUrl(trimmed);
  if (cached) return cached;
  if (!allowDownload) return null;
  return cacheRemoteImage(trimmed);
}

function isImageBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  const head = buf.subarray(0, Math.min(256, buf.length)).toString('utf8').toLowerCase();
  if (head.includes('<!doctype') || head.includes('<html') || head.trimStart().startsWith('<')) {
    return false;
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf[0] === 0x89 && buf[1] === 0x50) return true;
  if (buf.subarray(0, 3).toString('ascii') === 'GIF') return true;
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF') return true;
  return true;
}

async function downloadToFile(remoteUrl: string, destPath: string): Promise<boolean> {
  try {
    const res = await net.fetch(remoteUrl, {
      method: 'GET',
      redirect: 'follow',
    });
    if (!res.ok) return false;
    const ct = (res.headers.get('content-type') ?? '').toLowerCase();
    if (ct && !ct.startsWith('image/') && !ct.includes('octet-stream')) {
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!isImageBuffer(buf)) return false;
    await writeFile(destPath, buf);
    return true;
  } catch {
    return false;
  }
}

export async function cacheRemoteImage(remoteUrl: string): Promise<string | null> {
  const trimmed = remoteUrl?.trim();
  if (!trimmed) return null;

  const diskHit = await resolveFileOnDisk(trimmed);
  if (diskHit) return diskHit;

  const canonical = normalizeRemoteUrl(trimmed);
  const key = urlKey(canonical);

  return withIndexLock(async () => {
    const index = await readIndex();
    const existing = findIndexEntry(index, trimmed) ?? index[key];
    if (existing && isEntryValid(existing)) {
      const hit = await localPathForEntry(existing);
      if (hit) return hit;
    }

    const dir = await ensureImagesDir();
    const fileName = `${key}.${extFromUrl(canonical)}`;
    const fullPath = join(dir, fileName);

    if (!(await fileExists(fullPath))) {
      const ok = await downloadToFile(canonical, fullPath);
      if (!ok) {
        if (existing?.fileName) {
          const stale = join(dir, existing.fileName);
          if (await fileExists(stale)) return localPathForEntry(existing);
        }
        return null;
      }
    }

    index[key] = {
      remoteUrl: canonical,
      fileName,
      savedAt: Date.now(),
    };
    await writeIndexUnlocked(index);
    return toRendererCacheUrl(fullPath);
  });
}

const DEFAULT_CONCURRENCY = 6;

export async function cacheRemoteImages(
  urls: string[],
  concurrency = DEFAULT_CONCURRENCY,
): Promise<ImageCacheBatchResult> {
  await ensureImagesDir();

  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
  let cached = 0;
  let skipped = 0;
  let failed = 0;

  const index = await readIndex();
  const pending: string[] = [];

  for (const url of unique) {
    const canonical = normalizeRemoteUrl(url);
    if (await resolveFileOnDisk(url)) {
      skipped++;
      continue;
    }
    const entry = findIndexEntry(index, url) ?? index[urlKey(canonical)];
    if (entry && isEntryValid(entry)) {
      const dir = await ensureImagesDir();
      if (await fileExists(join(dir, entry.fileName))) {
        skipped++;
        continue;
      }
    }
    pending.push(canonical);
  }

  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < pending.length) {
      const i = cursor++;
      const url = pending[i];
      try {
        const result = await cacheRemoteImage(url);
        if (result) cached++;
        else failed++;
      } catch {
        failed++;
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, pending.length || 1) }, () =>
    worker(),
  );
  await Promise.all(workers);

  return {
    total: unique.length,
    cached,
    skipped,
    failed,
  };
}

export async function pruneExpiredImageCache(): Promise<void> {
  await ensureImagesDir();
  const index = await readIndex();
  const dir = await ensureImagesDir();
  const next: ImageCacheIndex = {};

  for (const [key, entry] of Object.entries(index)) {
    const full = join(dir, entry.fileName);
    if (!isEntryValid(entry)) {
      try {
        await unlink(full);
      } catch {
        /* ignore */
      }
      continue;
    }
    if (await fileExists(full)) next[key] = entry;
  }

  await writeIndex(next);
}
