/** Parametrlər / IPC üçün — main `device-fingerprint` ilə sinxron saxlanılmalıdır. */
export type LicenseDiagnostics = {
  fingerprintVersion: string;
  hardwareSeedSha256: string;
  licenseFingerprintToken: string;
  licenseEmailBound: boolean;
  hardwareSummary: string;
  /** Electron `process.platform` (məs. win32, darwin). */
  platform: string;
  hostname: string;
  appVersion: string;
};
