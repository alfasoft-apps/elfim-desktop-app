import axios, {
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useNetworkStatusStore } from '../stores/networkStatus';
import {
  ELFIM_DESKTOP_LICENSE_CONFIG,
  ELFIM_DESKTOP_FINGERPRINT_REJECTED,
  authFailureMessage,
  isAuthFailureEnvelope,
} from '../utils/auth-api-envelope';
import { logoutAndRedirectToLicenseGate } from '../utils/fingerprint-session-redirect';
import { openLicenseConfigGatePage } from '../utils/license-config-gate';
import { toIpcCloneable } from '../utils/ipc-serialize';

const TOKEN_KEY = 'auth_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function logoutUser(): void {
  localStorage.removeItem(TOKEN_KEY);
  try {
    localStorage.removeItem('elfim-cart');
  } catch {
    /* ignore */
  }
  window.location.reload();
}

function serializeHeaders(config: InternalAxiosRequestConfig): Record<string, string> {
  const h = config.headers;
  const out: Record<string, string> = {};
  if (!h) return out;
  const maybeJson = h as { toJSON?: () => Record<string, string> };
  if (typeof maybeJson.toJSON === 'function') {
    Object.assign(out, maybeJson.toJSON());
    return out;
  }
  for (const key of Object.keys(h)) {
    const v = (h as Record<string, unknown>)[key];
    if (v === undefined || v === null) continue;
    out[key] = typeof v === 'string' ? v : String(v);
  }
  return out;
}

function networkErrorMessage(): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'İnternet bağlantısı yoxdur.';
  }
  try {
    const network = useNetworkStatusStore();
    return network.isOnline
      ? 'Serverə qoşulmaq mümkün olmadı. Bir az sonra yenidən cəhd edin.'
      : 'İnternet bağlantısı yoxdur.';
  } catch {
    return 'İnternet bağlantısı yoxdur.';
  }
}

function notifyNetworkProbe(): void {
  try {
    void useNetworkStatusStore().runProbe();
  } catch {
    /* store not ready */
  }
}

/** Axios sorğularını main prosesdə `fetch` ilə icra et — Chromium CORS / file:// problemi olmur. */
const ipcAdapter: AxiosAdapter = async (config) => {
  const url = axios.getUri(config);
  const method = (config.method ?? 'get').toUpperCase();
  let body: string | null | undefined;
  if (config.data != null && config.data !== '') {
    body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
  }

  let raw;
  try {
    raw = await window.elfim.httpRequest({
      url,
      method,
      headers: serializeHeaders(config),
      body: body ?? null,
    });
  } catch (ipcErr) {
    notifyNetworkProbe();
    const err = new Error(networkErrorMessage());
    Object.assign(err, { code: 'ERR_NETWORK', config, isAxiosError: true, cause: ipcErr });
    throw err;
  }

  return {
    data: toIpcCloneable(raw.data),
    status: raw.status,
    statusText: raw.statusText,
    headers: toIpcCloneable(raw.headers) as AxiosResponse['headers'],
    config,
    request: {},
  } as AxiosResponse;
};

function pickAdapter(): AxiosAdapter | undefined {
  if (typeof window !== 'undefined' && typeof window.elfim?.httpRequest === 'function') {
    return ipcAdapter;
  }
  return undefined;
}

/** Axios müştərisi; bearer token `localStorage`-dadır. */
const http = axios.create({
  baseURL: import.meta.env.VITE_REST_API_ENDPOINT ?? '',
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  adapter: pickAdapter(),
});

function sendErrorToBackend(error: unknown, context: Record<string, unknown> = {}): void {
  const apiUrl = import.meta.env.VITE_REST_API_ENDPOINT ?? '';
  if (!apiUrl) return;

  const err = error instanceof Error ? error : new Error(String(error));

  /** `http` sorğuları IPC adapter ilə gedir — `fetch` kimi CORS / file:// problemi yoxdur. */
  http
    .post('/client-error-log', {
      error_message: err.message,
      api_url: context.apiUrl,
      stack_trace: err.stack,
      component: context.component,
      page_url: typeof window !== 'undefined' ? window.location.href : null,
      status_code: context.statusCode,
      response_data: context.responseData,
    })
    .catch(() => {});
}

function reportApiError(error: unknown, url: string): void {
  const axiosError = error as { response?: { status?: number; data?: unknown } };
  const statusCode = axiosError.response?.status;
  const responseData = axiosError.response?.data;

  sendErrorToBackend(error, {
    apiUrl: url,
    component: 'http-interceptor',
    statusCode,
    responseData,
  });
}

function extractApiErrorCode(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const c = (data as Record<string, unknown>).code;
  return typeof c === 'string' ? c : null;
}

function extractApiErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const m = (data as Record<string, unknown>).message;
  return typeof m === 'string' ? m : null;
}

function normalizeAxiosError(error: unknown): unknown {
  const ax = error as {
    message?: string;
    code?: string;
    response?: { status?: number };
  };
  const noResponse = !ax.response;
  const isNetwork =
    ax.code === 'ERR_NETWORK' ||
    ax.message === 'Network Error' ||
    ax.code === 'ECONNABORTED';
  if (noResponse && isNetwork) {
    notifyNetworkProbe();
    const wrapped = new Error(networkErrorMessage());
    (wrapped as { cause?: unknown }).cause = error;
    return wrapped;
  }
  return error;
}

http.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp !== undefined && payload.exp < currentTime) {
          logoutUser();
          return Promise.reject(new Error('Token expired'));
        }
        config.headers.Authorization = `Bearer ${token}`;
      } catch {
        logoutUser();
        return Promise.reject(new Error('Invalid token'));
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

http.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (isAuthFailureEnvelope(body)) {
      logoutUser();
      return Promise.reject(new Error(authFailureMessage(body)));
    }
    return response;
  },
  (error) => {
    const requestUrl = error.config?.url ?? 'unknown';

    if (typeof requestUrl === 'string' && !requestUrl.includes('client-error-log')) {
      reportApiError(error, requestUrl);
    }

    const status = error.response?.status;
    const body = error.response?.data;

    if (status === 403) {
      const code = extractApiErrorCode(body);
      const msg =
        extractApiErrorMessage(body) ??
        'Administrator ilə əlaqə saxlayın — lisenziya kodunuzu yeniləyin. / Contact admin to update your license fingerprint.';

      if (code === ELFIM_DESKTOP_LICENSE_CONFIG) {
        const skipGate =
          typeof requestUrl === 'string' && requestUrl.includes('client-error-log');
        if (!skipGate) {
          openLicenseConfigGatePage(msg);
        }
        return Promise.reject(normalizeAxiosError(error));
      }

      if (code === ELFIM_DESKTOP_FINGERPRINT_REJECTED) {
        logoutAndRedirectToLicenseGate(msg);
        return Promise.reject(normalizeAxiosError(error));
      }
    }

    if (status === 401 || isAuthFailureEnvelope(body)) {
      logoutUser();
    }

    return Promise.reject(normalizeAxiosError(error));
  },
);

export default http;
