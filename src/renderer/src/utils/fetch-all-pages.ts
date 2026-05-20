import http from '../api/http';
import type { PaginatedProducts, ProductListItem } from '../api/types';
import { parsePaginatedProducts } from '../api/parse';

const PAGE_SIZE = 100;

/** API-dən bütün səhifələri birləşdirir (oflayn keş fallback). */
export async function fetchAllPaginatedProducts(
  baseUrl: string,
  onProgress?: (page: number, lastPage: number) => void,
): Promise<PaginatedProducts<ProductListItem>> {
  let page = 1;
  let lastPage = 1;
  const merged: ProductListItem[] = [];

  do {
    const sep = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${sep}paginate=${PAGE_SIZE}&page=${page}`;
    const { data } = await http.get(url);
    const parsed = parsePaginatedProducts(data, { url });
    merged.push(...parsed.data);
    lastPage = parsed.meta?.last_page ?? 1;
    onProgress?.(page, lastPage);
    page++;
  } while (page <= lastPage);

  return {
    data: merged,
    meta: {
      current_page: 1,
      last_page: 1,
      total: merged.length,
    },
  };
}

export function paginatedListPayload(items: ProductListItem[]): unknown {
  return {
    data: items,
    meta: { current_page: 1, last_page: 1, total: items.length },
  };
}
