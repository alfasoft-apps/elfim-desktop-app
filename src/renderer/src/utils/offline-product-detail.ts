import type { ProductDetailEnvelope, ProductListItem } from '../api/types';
import type { DesktopCacheSnapshot } from '../types/app-data-cache';
import {
  findProductDetailInCache,
  productBySlug,
  productDetailEnvelopeFromRecord,
  toListItem,
} from './desktop-cache-query';

export { productIdFromSlug } from './desktop-cache-query';
export type { SearchOemFilters } from './desktop-cache-query';

export function findCatalogProductBySlug(
  bundle: DesktopCacheSnapshot | null,
  slug: string,
): ProductListItem | null {
  const row = productBySlug(bundle, slug);
  return row ? toListItem(row) : null;
}

export { findProductDetailInCache };

export function productDetailFromListItem(item: ProductListItem): ProductDetailEnvelope {
  return {
    ProductInfo: {
      id: item.id,
      name: item.name,
      slug: item.slug,
      cover: item.cover,
      price: item.price,
      old_price: item.old_price,
      unit_type: item.unit_type,
      stock_status: item.stock_status,
    },
    SimilarProducts: [],
    OtherProducts: [],
  };
}

export function isPartialOfflineDetail(detail: ProductDetailEnvelope | null): boolean {
  if (!detail?.ProductInfo) return false;
  const p = detail.ProductInfo;
  const hasExtra =
    Boolean(p.information?.trim()) ||
    (p.part_numbers?.length ?? 0) > 0 ||
    (p.product_details_table?.length ?? 0) > 0 ||
    (p.images?.length ?? 0) > 0;
  return !hasExtra;
}
