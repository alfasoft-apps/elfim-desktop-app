/**
 * Voyager banner və daxili yönləndirmə üçün keçidlər.
 * Hash-router istifadə olunur; localhost/file origin-i kopyalamaq lazım deyil.
 */

/**
 * Voyager / banner üçün hash-keçid: `#` + Vue Router `fullPath`.
 * `window.location.hash` Electron/Vite-də bəzən cari marşrutla sinxron qalmır — `route.fullPath` istifadə edin.
 */
export function getShareableHashHrefFromFullPath(fullPath: string): string {
  const fp = (fullPath || '/').trim();
  if (fp.startsWith('#')) return fp;
  if (fp === '') return '#/';
  return `#${fp.startsWith('/') ? fp : `/${fp}`}`;
}

export type ResolvedAppLink =
  | { type: 'internal'; path: string }
  | { type: 'external'; url: string };

/**
 * Banner və ya yapışdırılmış keçidi təhlil edir.
 * Daxili: `#/path`, `/path`, və ya tam URL-də `#/path` hash-i olanlar → Vue Router ilə.
 * Əks halda xarici URL (brauzerdə açılır).
 */
export function resolveAppNavigationLink(raw: string): ResolvedAppLink | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) {
    return null;
  }

  if (trimmed.startsWith('#/')) {
    return { type: 'internal', path: trimmed.slice(1) };
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return { type: 'internal', path: trimmed };
  }

  try {
    const base =
      typeof window !== 'undefined' && window.location?.href
        ? window.location.href
        : 'https://elfim.local/';
    const u = new URL(trimmed, base);
    if (u.hash.startsWith('#/')) {
      return { type: 'internal', path: u.hash.slice(1) };
    }
    if (u.protocol === 'mailto:' || u.protocol === 'tel:') {
      return { type: 'external', url: trimmed };
    }
    if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'file:') {
      return { type: 'external', url: trimmed };
    }
  } catch {
    /* ignore */
  }

  return { type: 'external', url: trimmed };
}
