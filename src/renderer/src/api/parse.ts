import type { PaginatedProducts, ProductListItem } from './types';
import { logParseError } from '../utils/api-log';
import { throwIfFailedApiEnvelope } from '../utils/auth-api-envelope';

export type ParseContext = {
  url?: string;
};

function normalizeMeta(meta: Record<string, unknown> | undefined): PaginatedProducts<ProductListItem>['meta'] {
  if (!meta) {
    return { current_page: 1, last_page: 1, total: 0 };
  }
  return {
    current_page: Number(meta.current_page ?? meta.currentPage ?? 1),
    last_page: Number(meta.last_page ?? meta.lastPage ?? 1),
    total: Number(meta.total ?? 0),
  };
}

function fail(context: string, message: string, payload: unknown, parseContext?: ParseContext): never {
  logParseError(context, message, payload, parseContext?.url);
  throw new Error(message);
}

function fromDataAndMeta(
  data: unknown,
  meta: Record<string, unknown> | undefined,
): PaginatedProducts<ProductListItem> {
  return {
    data: Array.isArray(data) ? (data as ProductListItem[]) : [],
    meta: normalizeMeta(meta),
  };
}

/** Məhsul səhifəsi cavabını təmizləyib tipə çevirir. */
export function parsePaginatedProducts(
  payload: unknown,
  parseContext?: ParseContext,
): PaginatedProducts<ProductListItem> {
  const ctx = 'parsePaginatedProducts';

  if (payload == null) {
    fail(ctx, 'Məhsul cavabı boşdur.', payload, parseContext);
  }

  if (typeof payload === 'string') {
    fail(
      ctx,
      'Məhsul cavabı gözlənilməz formatdadır (HTML və ya mətn). api-http.log faylına baxın.',
      payload,
      parseContext,
    );
  }

  if (Array.isArray(payload)) {
    return fromDataAndMeta(payload, { total: payload.length, current_page: 1, last_page: 1 });
  }

  if (typeof payload !== 'object') {
    fail(ctx, 'Məhsul cavabı gözlənilməz formatdadır.', payload, parseContext);
  }

  const root = payload as Record<string, unknown>;

  throwIfFailedApiEnvelope(root);

  if ('meta' in root && root.meta !== undefined && 'data' in root && Array.isArray(root.data)) {
    return fromDataAndMeta(root.data, root.meta as Record<string, unknown>);
  }

  if (root.success === true && root.data !== undefined) {
    const envData = root.data;

    if (Array.isArray(envData)) {
      return fromDataAndMeta(envData, {
        current_page: 1,
        last_page: 1,
        total: envData.length,
      });
    }

    if (envData && typeof envData === 'object' && !Array.isArray(envData)) {
      const inner = envData as Record<string, unknown>;
      if (Array.isArray(inner.data)) {
        return fromDataAndMeta(inner.data, inner.meta as Record<string, unknown> | undefined);
      }
    }
  }

  fail(
    ctx,
    'Məhsul siyahısı JSON formatı gözlənilməzdir. api-parse-error.log faylına baxın.',
    payload,
    parseContext,
  );
}

/** `search-product-name-by-list` və bənzər cavablar. */
export function extractProductListFromEnvelope(payload: unknown): ProductListItem[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  throwIfFailedApiEnvelope(root);
  if (!('data' in root)) return [];
  const data = root.data;
  if (Array.isArray(data)) return data as ProductListItem[];
  if (data && typeof data === 'object' && 'data' in (data as object)) {
    const inner = (data as Record<string, unknown>).data;
    if (Array.isArray(inner)) return inner as ProductListItem[];
  }
  return [];
}
