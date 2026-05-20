import type { PaginatedProducts, ProductListItem } from '../api/types';
import type { DesktopCacheSnapshot } from '../types/app-data-cache';
import {
  getProducts,
  productsByTypeFromCache,
  searchProductsInCache,
} from './desktop-cache-query';

export type { CachedProductRecord as CatalogProduct } from '../types/app-data-cache';

export function allProductsFromBundle(
  bundle: DesktopCacheSnapshot | null,
): ReturnType<typeof getProducts> {
  return getProducts(bundle);
}

export { searchProductsInCache as searchOemInCache, productsByTypeFromCache };
