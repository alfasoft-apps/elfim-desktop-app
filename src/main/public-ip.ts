import { net } from 'electron';
import { getApiBaseUrl } from '../shared/api-base';

const TIMEOUT_MS = 8000;

/** Bəzi şəbəkələr boş UA ilə cavab vermir. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ElfimDesktop/1.0';

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await net.fetch(url, {
      method: 'GET',
      bypassCustomProtocolHandlers: true,
      signal: controller.signal,
      headers: {
        Accept: 'text/plain,*/*;q=0.9,application/json;q=0.8',
        'User-Agent': UA,
      },
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseIpFromCloudflareTrace(body: string): string | null {
  const m = body.match(/^\s*ip=(\S+)/m);
  if (!m?.[1]) return null;
  return normalizeIpCandidate(m[1].trim());
}

function normalizeIpCandidate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const firstToken = s.split(/\s+/)[0] ?? s;
  return isPlausiblePublicIp(firstToken) ? firstToken : null;
}

function isPlausiblePublicIp(s: string): boolean {
  if (s.length < 7 || s.length > 45) return false;

  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(s)) {
    const octets = s.split('.').map((x) => Number(x));
    if (octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
    if (octets[0] === 10) return false;
    if (octets[0] === 127) return false;
    if (octets[0] === 0) return false;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return false;
    if (octets[0] === 192 && octets[1] === 168) return false;
    return true;
  }

  if (s.includes(':')) {
    const lower = s.toLowerCase();
    if (lower.startsWith('fe80:')) return false;
    if (lower === '::1') return false;
    return true;
  }

  return false;
}

/** Laravel `$request->ip()` — Voyager `desktop_allowed_ips` üçün ən uyğun dəyər. */
async function fetchServerSeenClientIp(): Promise<string | null> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const url = `${base}/client-visible-ip`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await net.fetch(url, {
      method: 'GET',
      bypassCustomProtocolHandlers: true,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': UA,
      },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { ip?: string };
    const raw = typeof j.ip === 'string' ? j.ip.trim() : '';
    return raw || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Çıxış IP (admin whitelist üçün — IPv4 və ya IPv6).
 * Bir neçə xidmət sırası ilə; ipify bloklananda Cloudflare trace işləyir.
 */
export async function fetchPublicIpv4(): Promise<string | null> {
  const fromApi = await fetchServerSeenClientIp();
  if (fromApi) return fromApi;

  const cfTrace = await fetchText('https://1.1.1.1/cdn-cgi/trace');
  if (cfTrace) {
    const ip = parseIpFromCloudflareTrace(cfTrace);
    if (ip) return ip;
  }

  const plain = await fetchText('https://api.ipify.org');
  if (plain) {
    const ip = normalizeIpCandidate(plain);
    if (ip) return ip;
  }

  const ican = await fetchText('https://icanhazip.com');
  if (ican) {
    const ip = normalizeIpCandidate(ican);
    if (ip) return ip;
  }

  const ifc = await fetchText('https://ifconfig.me/ip');
  if (ifc) {
    const ip = normalizeIpCandidate(ifc);
    if (ip) return ip;
  }

  const jsonRaw = await fetchText('https://api.ipify.org?format=json');
  if (jsonRaw) {
    try {
      const j = JSON.parse(jsonRaw) as { ip?: string };
      if (typeof j.ip === 'string') {
        const ip = normalizeIpCandidate(j.ip);
        if (ip) return ip;
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}
