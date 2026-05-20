import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { app, shell } from 'electron';
import type { HttpIpcRequest } from '../shared/http-ipc';

export const HTTP_LOG_FILE = 'api-http.log';
export const PARSE_LOG_FILE = 'api-parse-error.log';

const MAX_BODY_CHARS = 16_384;

let logsRootPromise: Promise<string> | null = null;

/** `…/userData/logs` — tarix qovluqları bunun altında: `YYYY/MM/DD/*.log`. */
export async function getLogsDirectory(): Promise<string> {
  return logsRoot();
}

export async function openLogsDirectory(): Promise<string> {
  const dir = await logsRoot();
  await shell.openPath(dir);
  return dir;
}

async function logsRoot(): Promise<string> {
  if (!logsRootPromise) {
    logsRootPromise = (async () => {
      const dir = join(app.getPath('userData'), 'logs');
      await mkdir(dir, { recursive: true });
      return dir;
    })();
  }
  return logsRootPromise;
}

/** Məs: `logs/2026/05/17/api-http.log` */
async function datedLogsDirectory(): Promise<string> {
  const root = await logsRoot();
  const d = new Date();
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dir = join(root, y, m, day);
  await mkdir(dir, { recursive: true });
  return dir;
}

function redactHeaders(h: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...h };
  for (const key of Object.keys(out)) {
    const k = key.toLowerCase();
    if (k === 'authorization' || k === 'cookie' || k === 'set-cookie') {
      out[key] = '[REDACTED]';
    }
  }
  return out;
}

function truncateText(s: string): string {
  if (s.length <= MAX_BODY_CHARS) return s;
  return `${s.slice(0, MAX_BODY_CHARS)}… [truncated ${s.length - MAX_BODY_CHARS} chars]`;
}

function bodyPreview(body: string | null | undefined): string {
  if (body == null || body === '') return '';
  return truncateText(body);
}

function dataPreview(data: unknown): string {
  if (data == null) return '';
  if (typeof data === 'string') return truncateText(data);
  try {
    const s = JSON.stringify(data, (_key, value) => {
      if (Array.isArray(value) && value.length > 50) {
        return `[Array length=${value.length}]`;
      }
      return value as unknown;
    });
    return truncateText(s);
  } catch {
    return '[unserializable]';
  }
}

async function appendJsonLine(fileName: string, entry: Record<string, unknown>): Promise<void> {
  try {
    const dir = await datedLogsDirectory();
    await appendFile(join(dir, fileName), `${JSON.stringify(entry)}\n`, 'utf8');
  } catch {
    // logging must not break HTTP
  }
}

/** Bütün HTTP sorğu/cavab/xəta — tarix qovluğunda `api-http.log` (JSON lines). */
export async function appendHttpLogEntry(entry: Record<string, unknown>): Promise<void> {
  await appendJsonLine(HTTP_LOG_FILE, {
    ts: new Date().toISOString(),
    ...entry,
  });
}

export async function appendHttpRequestLog(req: HttpIpcRequest, requestId: string): Promise<void> {
  await appendHttpLogEntry({
    kind: 'request',
    requestId,
    method: req.method,
    url: req.url,
    headers: redactHeaders(req.headers),
    body: bodyPreview(req.body ?? undefined),
  });
}

export async function appendHttpResponseLog(
  req: HttpIpcRequest,
  requestId: string,
  res: {
    ok: boolean;
    status: number;
    statusText: string;
    data: unknown;
    headers: Record<string, string>;
  },
): Promise<void> {
  await appendHttpLogEntry({
    kind: 'response',
    requestId,
    method: req.method,
    url: req.url,
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    headers: redactHeaders(res.headers),
    body: dataPreview(res.data),
  });
}

export async function appendHttpErrorLog(
  req: HttpIpcRequest,
  requestId: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const cause =
    error instanceof Error && error.cause != null
      ? error.cause instanceof Error
        ? error.cause.message
        : String(error.cause)
      : undefined;
  await appendHttpLogEntry({
    kind: 'error',
    requestId,
    method: req.method,
    url: req.url,
    message,
    cause,
  });
}

/** JSON parse / format xətaları — `api-parse-error.log`. */
export async function appendParseErrorLog(entry: {
  context: string;
  url?: string;
  message: string;
  payloadPreview?: string;
}): Promise<void> {
  await appendJsonLine(PARSE_LOG_FILE, {
    ts: new Date().toISOString(),
    kind: 'parse_error',
    ...entry,
  });
}
