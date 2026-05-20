import type { ProductListItem } from '../api/types';

/** Web `generate-cart-item` — məhsul siyahısından səbət sətri. */
export function generateCartItemFromProduct(item: ProductListItem, quantity = 1) {
  const id = Number(item.id);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('Məhsul ID yanlışdır.');
  }
  const rawSlug = item.slug ?? String(id);
  const slug = rawSlug.startsWith(`${id}-`) ? rawSlug : `${id}-${rawSlug}`;
  const price = Number(item.price);
  return {
    id,
    name: item.name ?? '',
    slug,
    image: item.cover ?? undefined,
    price: Number.isFinite(price) ? price : 0,
    quantity,
  };
}

export function productIdFromLine(line: Record<string, unknown>): number | null {
  const id = Number(line.id ?? line.Id);
  if (Number.isFinite(id) && id > 0) return id;
  const slug = line.slug as string | undefined;
  if (!slug || typeof slug !== 'string') return null;
  const idx = slug.indexOf('-');
  const prefix = idx >= 0 ? slug.slice(0, idx) : slug;
  const n = parseInt(prefix, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
