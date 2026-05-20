import { readFile } from 'fs/promises';
import { extname } from 'path';
import { protocol } from 'electron';

export const CACHE_IMAGE_SCHEME = 'elfim-cache';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

function mimeForPath(filePath: string): string {
  return MIME_BY_EXT[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

/** Renderer `<img>` — `elfim-cache:///C:/path/to/file.jpg` */
export function toRendererCacheUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/');
  return `${CACHE_IMAGE_SCHEME}:///${encodeURI(normalized)}`;
}

export function registerCacheImageProtocol(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: CACHE_IMAGE_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

function absolutePathFromElfimCacheUrl(requestUrl: string): string {
  const parsed = new URL(requestUrl);
  let filePath = decodeURIComponent(parsed.pathname || '');
  // elfim-cache:///C:/Users/... → pathname "/C:/Users/..."
  if (process.platform === 'win32' && /^\/[A-Za-z]:\//.test(filePath)) {
    filePath = filePath.slice(1);
  } else if (filePath.startsWith('/') && process.platform !== 'win32') {
    filePath = filePath.replace(/^\/+/, '/');
  }
  return filePath;
}

export function setupCacheImageProtocolHandler(): void {
  protocol.handle(CACHE_IMAGE_SCHEME, async (request) => {
    try {
      const filePath = absolutePathFromElfimCacheUrl(request.url);
      if (!filePath) return new Response(null, { status: 404 });
      const data = await readFile(filePath);
      return new Response(new Uint8Array(data), {
        headers: {
          'Content-Type': mimeForPath(filePath),
          'Cache-Control': 'private, max-age=31536000',
        },
      });
    } catch {
      return new Response(null, { status: 404 });
    }
  });
}
