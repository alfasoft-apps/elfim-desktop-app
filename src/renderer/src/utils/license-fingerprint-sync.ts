const TOKEN_KEY = 'auth_token';

function pickEmailClaim(payload: Record<string, unknown>): string | null {
  const keys = [
    'email',
    'Email',
    'unique_name',
    'user_email',
    'preferred_username',
    'upn',
  ] as const;
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === 'string' && v.includes('@')) return v.trim().toLowerCase();
  }
  return null;
}

export function emailFromStoredJwt(): string | null {
  const t = localStorage.getItem(TOKEN_KEY);
  if (!t) return null;
  try {
    const p = JSON.parse(atob(t.split('.')[1])) as Record<string, unknown>;
    return pickEmailClaim(p);
  } catch {
    return null;
  }
}

/**
 * Main prosesə cari istifadəçi e-poçtunu ötürür (lisenziya barmaq izi tokeni üçün).
 * Bu məlumat main-də `SHA-256` ilə cihaz toxumu birləşdirilir; renderer yalnız e-poçt ötürür.
 */
export async function syncLicenseFingerprintFromSession(): Promise<void> {
  if (typeof window === 'undefined' || typeof window.elfim?.setLicenseEmail !== 'function') {
    return;
  }
  try {
    const email = emailFromStoredJwt();
    await window.elfim.setLicenseEmail(email);
    if (typeof window.elfim.verifyDeviceFingerprint === 'function') {
      const check = await window.elfim.verifyDeviceFingerprint();
      if (!check.ok) {
        throw new Error(check.message);
      }
    }
  } catch {
    /* Əsas prosesdə IPC handler müvəqqəti əlçatan deyilsə (məs. dev HMR) giriş uğursuz olmasın. */
  }
}
