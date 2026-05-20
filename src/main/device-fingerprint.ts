/**
 * Lisenziya üçün cihaz izi: CPU/GPU/sistem identifikatorları + istifadəçi e-poçtu (IPC ilə).
 * Hesablama main prosesdədir — renderer təkbaşına saxta başlıq yaza bilmir.
 * Hər token yaratmada canlı avadanlıq toxumu keşlə müqayisə olunur (köçürülmüş keş / oğurlanmış token).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { hostname as osHostname, userInfo } from 'node:os';
import { join } from 'node:path';
import { app } from 'electron';
import si from 'systeminformation';
import type { LicenseDiagnostics } from '../shared/license-diagnostics';

const CACHE_FILENAME = '.device-seed.enc';
const FP_VERSION = '2';

let hardwareSeedPromise: Promise<string> | null = null;

/** Renderer JWT-dən sinxronlanan müştəri e-poçtu (normalizə olunmuş). */
let licenseEmailNormalized: string | null = null;

export class DeviceFingerprintMismatchError extends Error {
  constructor() {
    super(
      'Bu lisenziya bu kompüterə uyğun deyil. Avadanlıq dəyişibsə və ya kod başqa PC-dən köçürülübsə, administrator yenidən qeydiyyat etməlidir.',
    );
    this.name = 'DeviceFingerprintMismatchError';
  }
}

export function setLicenseEmail(email: string | null): void {
  if (email == null || email === '') {
    licenseEmailNormalized = null;
    return;
  }
  const t = email.trim().toLowerCase();
  licenseEmailNormalized = t.length > 254 ? t.slice(0, 254) : t;
}

function deriveKey(): Buffer {
  const hi = userInfo().username ?? '';
  let salt = `${osHostname()}|${hi}`;
  try {
    if (app?.isReady?.()) {
      salt += `|${app.getPath('userData')}`;
    }
  } catch {
    /* ignore */
  }
  return scryptSync(salt, 'elfim-device-fp-v1', 32);
}

function encryptString(plain: string): Buffer {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

function decryptString(buf: Buffer): string {
  const key = deriveKey();
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data, undefined, 'utf8') + decipher.final('utf8');
}

async function collectHardwareParts(): Promise<string> {
  const [system, cpu, graphics, baseboard] = await Promise.all([
    si.system(),
    si.cpu(),
    si.graphics(),
    si.baseboard(),
  ]);

  /** Əlaqədar GPU sırası WMI tərəfindən dəyişə bilər — eyni PC üçün sabit toxum üçün sıralayırıq. */
  const controllers = graphics.controllers ?? [];
  const gpu =
    controllers.length === 0
      ? undefined
      : [...controllers].sort((a, b) => {
          const ka = `${a.pciID ?? ''}|${a.busAddress ?? ''}|${String(a.model ?? '')}`;
          const kb = `${b.pciID ?? ''}|${b.busAddress ?? ''}|${String(b.model ?? '')}`;
          return ka.localeCompare(kb);
        })[0];
  const cpuSerialHint =
    (cpu as unknown as { processorId?: string }).processorId ??
    (cpu as unknown as { serial?: string }).serial ??
    '';

  const parts: string[] = [
    `sys:${system.uuid || ''}`,
    `sys-serial:${system.serial || ''}`,
    `board:${baseboard?.serial || ''}`,
    `cpu:${cpuSerialHint || `${cpu.manufacturer}|${cpu.brand}|${cpu.model}|${cpu.stepping}`}`,
    `gpu:${gpu?.pciID || gpu?.deviceId || ''}:${gpu?.vendorId || ''}:${gpu?.vendor || ''}:${gpu?.model || ''}:${gpu?.bus || ''}:${gpu?.busAddress || ''}`,
  ];

  const joined = parts.join('|');
  if (!joined.replace(/[:|]/g, '').trim()) {
    return `fallback:${osHostname()}|${userInfo().username}`;
  }
  return joined;
}

async function computeHardwareSeed(): Promise<string> {
  const raw = await collectHardwareParts();
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

function cachePath(): string {
  return join(app.getPath('userData'), CACHE_FILENAME);
}

function invalidateSeedCache(): void {
  hardwareSeedPromise = null;
  try {
    const path = cachePath();
    if (existsSync(path)) unlinkSync(path);
  } catch {
    /* ignore */
  }
}

/**
 * Canlı avadanıqla keşi müqayisə edir.
 * Uyğunsuzluq = başqa PC-dən köçürülmüş `.device-seed.enc` və ya əhəmiyyətli hardware dəyişikliyi.
 */
async function getHardwareSeedVerified(): Promise<string> {
  const live = await computeHardwareSeed();
  const path = cachePath();

  if (existsSync(path)) {
    try {
      const buf = readFileSync(path);
      const cached = decryptString(buf);
      if (
        cached.length === 64 &&
        /^[a-f0-9]+$/i.test(cached) &&
        cached.toLowerCase() === live.toLowerCase()
      ) {
        return live;
      }
      invalidateSeedCache();
      throw new DeviceFingerprintMismatchError();
    } catch (err) {
      if (err instanceof DeviceFingerprintMismatchError) throw err;
      invalidateSeedCache();
    }
  }

  try {
    writeFileSync(path, encryptString(live));
  } catch {
    /* disk yazılmadı — yalnız yaddaşda */
  }
  return live;
}

export function getHardwareSeed(): Promise<string> {
  if (!hardwareSeedPromise) {
    hardwareSeedPromise = getHardwareSeedVerified();
  }
  return hardwareSeedPromise;
}

/** Arxa plan yoxlaması — canlı avadanlıq keşlə uyğun gəlmirsə bloklanır. */
export async function verifyDeviceFingerprint(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const live = await computeHardwareSeed();
    const path = cachePath();

    if (!existsSync(path)) {
      hardwareSeedPromise = null;
      await getHardwareSeedVerified();
      return { ok: true };
    }

    const cached = decryptString(readFileSync(path));
    if (cached.toLowerCase() === live.toLowerCase()) {
      return { ok: true };
    }

    invalidateSeedCache();
    return { ok: false, message: new DeviceFingerprintMismatchError().message };
  } catch (err) {
    if (err instanceof DeviceFingerprintMismatchError) {
      return { ok: false, message: err.message };
    }
    return { ok: false, message: 'Cihaz yoxlaması uğursuz oldu.' };
  }
}

/** E-poçt daxil edilmir — eyni kompüterdə fərqli hesablar eyni başlığı göndərir (POS/shared device). */
export async function buildLicenseFingerprintToken(): Promise<string> {
  const hw = await getHardwareSeed();
  const material = `${FP_VERSION}|${hw}`;
  return createHash('sha256').update(material, 'utf8').digest('hex');
}

export function getFingerprintVersion(): string {
  return FP_VERSION;
}

export async function getLicenseDiagnostics(): Promise<LicenseDiagnostics> {
  const [hardwareSeedSha256, licenseFingerprintToken, hardwareSummary] = await Promise.all([
    getHardwareSeed(),
    buildLicenseFingerprintToken(),
    collectHardwareParts(),
  ]);

  let appVersion = '';
  try {
    appVersion = app.getVersion();
  } catch {
    appVersion = '';
  }

  return {
    fingerprintVersion: FP_VERSION,
    hardwareSeedSha256,
    licenseFingerprintToken,
    licenseEmailBound: licenseEmailNormalized != null && licenseEmailNormalized !== '',
    hardwareSummary,
    platform: process.platform,
    hostname: osHostname(),
    appVersion,
  };
}
