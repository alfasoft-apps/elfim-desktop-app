/** Son uğurlu giriş — JWT-da email olmayanda və ya keş boş olanda lisenziya / UI üçün. */
const EMAIL_KEY = 'elfim_last_account_email';
const NAME_KEY = 'elfim_last_account_name';

function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  return e.includes('@') ? e : null;
}

export function persistLastAccountEmail(email: string | null | undefined): void {
  const n = typeof email === 'string' ? normalizeEmail(email) : null;
  if (!n) return;
  try {
    localStorage.setItem(EMAIL_KEY, n);
  } catch {
    /* ignore */
  }
}

export function persistLastAccountFromUser(
  user: { email?: string | null; name?: string | null } | null | undefined,
): void {
  if (!user) return;
  persistLastAccountEmail(user.email ?? undefined);
  if (typeof user.name === 'string' && user.name.trim()) {
    try {
      localStorage.setItem(NAME_KEY, user.name.trim());
    } catch {
      /* ignore */
    }
  }
}

export function readLastAccountEmail(): string | null {
  try {
    const v = localStorage.getItem(EMAIL_KEY);
    return typeof v === 'string' ? normalizeEmail(v) : null;
  } catch {
    return null;
  }
}

export function readLastAccountName(): string | null {
  try {
    const v = localStorage.getItem(NAME_KEY);
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}
