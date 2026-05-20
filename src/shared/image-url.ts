/** Relativ şəkil yollarını tam URL-ə çevirir (renderer + main eyni məntiq). */

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

export function resolveImageUrl(
  raw: string | null | undefined,
  apiBase: string,
): string | undefined {
  if (!raw?.trim()) return undefined;
  const s = raw.trim();
  if (s.startsWith('//')) return `https:${s}`;
  try {
    const abs = new URL(s);
    return abs.href;
  } catch {
    /* ignore */
  }
  const origin = siteOriginFromApiBase(apiBase);
  if (!origin) return undefined;
  if (s.startsWith('/')) return `${origin}${s}`;
  return `${origin}/${s.replace(/^\/+/, '')}`;
}

function stripSearchHash(href: string): string | null {
  try {
    const u = new URL(href.includes('://') ? href : `https://${href.replace(/^\/\//, '')}`);
    u.search = '';
    u.hash = '';
    return u.href;
  } catch {
    return null;
  }
}

function httpHttpsVariant(href: string): string | null {
  try {
    const u = new URL(href);
    const next = u.protocol === 'https:' ? 'http:' : 'https:';
    return new URL(u.pathname + u.search + u.hash, `${next}//${u.host}`).href;
  } catch {
    return null;
  }
}

/** Keş açarı üçün mümkün variantlar (nisbi, tam URL, query/hash sızılmış, http/https). */
export function imageUrlLookupKeys(raw: string, apiBase: string): string[] {
  const keys = new Set<string>();
  const trimmed = raw.trim();
  if (!trimmed) return [];
  keys.add(trimmed);

  const resolved = resolveImageUrl(trimmed, apiBase);
  if (resolved) keys.add(resolved);

  for (const base of [trimmed, resolved]) {
    if (!base) continue;
    const stripped = stripSearchHash(base);
    if (stripped) keys.add(stripped);
    const alt = httpHttpsVariant(base);
    if (alt) keys.add(alt);
    const strippedAlt = alt ? stripSearchHash(alt) : null;
    if (strippedAlt) keys.add(strippedAlt);
  }

  return [...keys];
}
