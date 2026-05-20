/** Production default — GitHub CI və quraşdırılmış .exe üçün (.env olmadan). */
export const DEFAULT_API_BASE = 'https://admin.elfim.az/api';

/** Renderer (Vite) və main (process.env) üçün API əsas ünvanı. */
export function resolveApiBaseUrl(
  viteOrExplicit?: string | null,
  processEnv?: string | null,
): string {
  const fromVite = viteOrExplicit?.trim();
  if (fromVite) return fromVite;
  const fromProcess = processEnv?.trim();
  if (fromProcess) return fromProcess;
  return DEFAULT_API_BASE;
}

/** Main proses üçün API əsas ünvanı. */
export function getApiBaseUrl(): string {
  return resolveApiBaseUrl(undefined, process.env.VITE_REST_API_ENDPOINT);
}
