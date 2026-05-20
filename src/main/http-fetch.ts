import { net } from 'electron';
import type { HttpIpcRequest, HttpIpcResponse } from '../shared/http-ipc';

/** Node/Electron `fetch` səbəbini istifadəçiyə oxunaqlı mesaja çevirir. */
export function formatHttpFetchError(err: unknown, url: string): string {
  const base = `API sorğusu uğursuz oldu: ${url}`;

  const cause =
    err instanceof Error && err.cause != null
      ? err.cause
      : err instanceof Error
        ? err
        : null;

  const code =
    cause != null && typeof cause === 'object' && 'code' in cause
      ? String((cause as { code: unknown }).code)
      : '';

  if (code === 'UND_ERR_CONNECT_TIMEOUT' || code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
    return `${base}\nBağlantı vaxtı bitdi. İnternet, VPN və ya serverin əlçatanlığını yoxlayın. Yerli inkişaf üçün .env.development ilə Herd API istifadə edin.`;
  }
  if (code === 'ENOTFOUND') {
    return `${base}\nServer tapılmadı (DNS). VITE_REST_API_ENDPOINT ünvanını yoxlayın.`;
  }
  if (code === 'ECONNREFUSED') {
    return `${base}\nServer cavab vermir. Laravel / Herd işləyir?`;
  }
  if (
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    code === 'CERT_HAS_EXPIRED' ||
    code === 'DEPTH_ZERO_SELF_SIGNED_CERT'
  ) {
    return `${base}\nSSL sertifikat xətası. Yerli .test domenində Herd CA quraşdırılıb olmalıdır.`;
  }

  if (err instanceof Error && err.message && err.message !== 'fetch failed') {
    return `${base}\n${err.message}`;
  }

  return `${base}\nŞəbəkə xətası (fetch failed). İnternet və VITE_REST_API_ENDPOINT dəyərini yoxlayın.`;
}

/**
 * Chromium şəbəkə yığını (proxy, sistem sertifikatları) — Node `fetch`-dən etibarlıdır.
 */
export async function performHttpRequest(payload: HttpIpcRequest): Promise<HttpIpcResponse> {
  const method = payload.method.toUpperCase();
  const init: RequestInit & { bypassCustomProtocolHandlers?: boolean } = {
    method,
    headers: payload.headers,
    bypassCustomProtocolHandlers: true,
  };
  if (method !== 'GET' && method !== 'HEAD' && payload.body != null && payload.body !== '') {
    init.body = payload.body;
  }

  let res: Response;
  try {
    res = await net.fetch(payload.url, init);
  } catch (err) {
    throw new Error(formatHttpFetchError(err, payload.url));
  }

  const text = await res.text();
  const ct = res.headers.get('content-type') ?? '';
  let data: unknown = text;
  if (ct.includes('application/json')) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText || String(res.status),
    data,
    headers,
  };
}
