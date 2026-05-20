/**
 * Renderer üçün güzgü tip — `src/shared/license-diagnostics.ts` ilə eyni saxlanılmalıdır
 * (web TS layihəsi composite TS6305 görməsin deyə burada təkrarlanır).
 */
export type LicenseDiagnostics = {
  fingerprintVersion: string;
  hardwareSeedSha256: string;
  licenseFingerprintToken: string;
  licenseEmailBound: boolean;
  hardwareSummary: string;
  platform: string;
  hostname: string;
  appVersion: string;
};
