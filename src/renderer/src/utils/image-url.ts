/** Relativ şəkil yollarını tam URL-ə çevirir. */

export function siteOriginFromApiBase(apiBase: string): string {
  const trimmed = apiBase.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return u.origin;
  } catch {
    return '';
  }
}

export function resolveImageUrl(raw: string | null | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const s = raw.trim();
  if (s.startsWith('//')) return `https:${s}`;
  try {
    const abs = new URL(s);
    return abs.href;
  } catch {
    /* ignore */
  }
  const apiBase = import.meta.env.VITE_REST_API_ENDPOINT ?? '';
  const origin = siteOriginFromApiBase(apiBase);
  if (!origin) return undefined;
  if (s.startsWith('/')) return `${origin}${s}`;
  return `${origin}/${s.replace(/^\/+/, '')}`;
}
