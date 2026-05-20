const DEFAULT_API_BASE = 'https://admin.elfim.az/api';

/** Main proses üçün API əsas ünvanı (VITE_REST_API_ENDPOINT və ya default). */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.VITE_REST_API_ENDPOINT?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_API_BASE;
}
