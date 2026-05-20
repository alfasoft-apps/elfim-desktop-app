import { logoutAndRedirectToLicenseGate } from './fingerprint-session-redirect';
import { openLicenseConfigGatePage } from './license-config-gate';

/** Backend `VerifyDesktopClientAccess` ilə uyğun — HTTP interceptor və parse eyni kodları tanıyır. */
export const ELFIM_DESKTOP_FINGERPRINT_REJECTED = 'ELFIM_DESKTOP_FINGERPRINT_REJECTED';
export const ELFIM_DESKTOP_LICENSE_CONFIG = 'ELFIM_DESKTOP_LICENSE_CONFIG';

/**
 * Laravel JWT və bənzəri cavablarda `success: false` + sessiya mesajı (HTTP 200 ola bilər).
 * Bu halda axios «uğurlu» cavab qaytarır; məhsul parse əvvəl sessiya təmizlənməlidir.
 */
export function isAuthFailureEnvelope(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const r = data as Record<string, unknown>;
  if (r.success !== false) return false;
  const msg = String(r.message ?? '').toLowerCase();
  if (msg.includes('blacklist') || msg.includes('blacklisted')) return true;
  if (msg.includes('unauthenticated')) return true;
  if (msg.includes('could not parse token')) return true;
  if (msg.includes('invalid token')) return true;
  if (msg.includes('token has expired') || msg.includes('token expired')) return true;
  if (msg.includes('signature verification failed')) return true;
  if (msg.includes('token not provided')) return true;
  return false;
}

export function authFailureMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Sessiya etibarlı deyil.';
  const m = (data as Record<string, unknown>).message;
  return typeof m === 'string' && m.trim() ? m.trim() : 'Sessiya etibarlı deyil.';
}

/** `success: false` üçün mesaj; sessiya xətası olmayanda ümumi mətn. */
export function apiFailureMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return 'API cavabı uğursuz oldu.';
  const m = (data as Record<string, unknown>).message;
  return typeof m === 'string' && m.trim() ? m.trim() : 'API cavabı uğursuz oldu.';
}

/**
 * Məhsul/siyahı JSON-u parse etməzdən əvvəl — gözlənilməz format əvəzinə server mesajını göstərir.
 * (Bəzən xəta gövdəsi 2xx və ya adapter axını ilə parse-a düşə bilər.)
 */
export function throwIfFailedApiEnvelope(data: unknown): void {
  if (!data || typeof data !== 'object') return;
  const r = data as Record<string, unknown>;
  if (r.success !== false) return;

  if (isAuthFailureEnvelope(r)) {
    throw new Error(authFailureMessage(r));
  }

  const code = r.code;
  if (code === ELFIM_DESKTOP_LICENSE_CONFIG) {
    const msg = apiFailureMessage(r);
    openLicenseConfigGatePage(msg);
    throw new Error(msg);
  }
  if (code === ELFIM_DESKTOP_FINGERPRINT_REJECTED) {
    const msg = apiFailureMessage(r);
    logoutAndRedirectToLicenseGate(msg);
    throw new Error(msg);
  }

  throw new Error(apiFailureMessage(r));
}
