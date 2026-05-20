import { net } from 'electron';

/** Chrome / Android standart connectivity probe (204 No Content). */
const CONNECTIVITY_URL = 'https://connectivitycheck.gstatic.com/generate_204';
const TIMEOUT_MS = 8000;

/** Əsl internet çıxışını yoxlayır (yalnız OS `onLine` kifayət etmir). */
export async function checkInternetConnectivity(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await net.fetch(CONNECTIVITY_URL, {
      method: 'HEAD',
      bypassCustomProtocolHandlers: true,
      signal: controller.signal,
    });
    return res.status === 204 || res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
