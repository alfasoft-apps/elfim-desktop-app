import { openLicenseConfigGatePage } from './license-config-gate';
import { useSessionAuthStore } from '../stores/sessionAuth';

const TOKEN_KEY = 'auth_token';

/**
 * Log out locally and open the license info route with a gate message (sessionStorage + hash).
 * Hash navigation is synchronous so the POS shell is left before axios rejection handlers can show inline errors.
 */
export function logoutAndRedirectToLicenseGate(message: string): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('elfim-cart');
  } catch {
    /* ignore */
  }
  try {
    useSessionAuthStore().refresh();
  } catch {
    /* Pinia not mounted yet */
  }
  void window.elfim?.setLicenseEmail?.(null);
  openLicenseConfigGatePage(message);
}
