import { ROUTES } from '../constants/routes';

const STORAGE_KEY = 'elfim_license_config_gate_v1';

export type LicenseConfigGatePayload = {
  message: string;
  ts: number;
};

export function activateLicenseConfigGate(message: string): void {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ message, ts: Date.now() } satisfies LicenseConfigGatePayload),
    );
  } catch {
    /* ignore */
  }
}

export function readLicenseConfigGate(): LicenseConfigGatePayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<LicenseConfigGatePayload>;
    if (typeof o.message !== 'string') return null;
    return { message: o.message, ts: typeof o.ts === 'number' ? o.ts : Date.now() };
  } catch {
    return null;
  }
}

export function clearLicenseConfigGate(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isLicenseConfigGateActive(): boolean {
  return readLicenseConfigGate() != null;
}

/**
 * Server Voyager-də `fingerprint_token` yanlış olanda — kilidi aktiv edir və yalnız lisenziya səhifəsinə keçirir.
 */
export function openLicenseConfigGatePage(message: string): void {
  activateLicenseConfigGate(message);
  if (typeof window === 'undefined') return;
  window.location.hash = `#${ROUTES.LICENSE_PROFILE}`;
}
