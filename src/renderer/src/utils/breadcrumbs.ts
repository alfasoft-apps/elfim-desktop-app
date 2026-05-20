import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { ROUTES } from '../constants/routes';

export type BreadcrumbItem = { label: string; to?: string };

function decodeSegment(s: string): string {
  if (!s) return '';
  try {
    return decodeURIComponent(s).replace(/-/g, ' ');
  } catch {
    return s.replace(/-/g, ' ');
  }
}

/** Breadcrumb trail for the current route (hash router paths). */
export function breadcrumbsForRoute(route: RouteLocationNormalizedLoaded): BreadcrumbItem[] {
  const base: BreadcrumbItem = { label: 'Əsas', to: ROUTES.HOME };

  switch (route.name) {
    case 'home':
      return [{ label: 'Əsas', to: undefined }];
    case 'search':
      return [base, { label: 'Axtarış', to: undefined }];
    case 'shops':
      return [base, { label: 'Mağazalar', to: undefined }];
    case 'shop-detail':
      return [
        base,
        { label: 'Mağazalar', to: ROUTES.SHOPS },
        { label: decodeSegment(String(route.params.slug ?? '')), to: undefined },
      ];
    case 'catalog-brisk':
      return [base, { label: 'Şam (BRISK)', to: undefined }];
    case 'catalog-tesla':
      return [base, { label: 'Babin', to: undefined }];
    case 'product-detail':
      return [
        base,
        { label: 'Məhsul', to: ROUTES.SEARCH },
        { label: decodeSegment(String(route.params.slug ?? '')), to: undefined },
      ];
    case 'cart':
      return [base, { label: 'Səbət', to: undefined }];
    case 'checkout':
      return [base, { label: 'Səbət', to: ROUTES.CART }, { label: 'Ödəniş', to: undefined }];
    case 'complete-order':
      return [
        base,
        { label: 'Ödəniş', to: ROUTES.CHECKOUT },
        { label: 'Sifariş tamamlandı', to: undefined },
      ];
    case 'signin':
      return [base, { label: 'Daxil ol', to: undefined }];
    case 'account':
      return [base, { label: 'Hesab', to: undefined }];
    case 'orders':
      return [base, { label: 'Hesab', to: ROUTES.ACCOUNT }, { label: 'Sifarişlərim', to: undefined }];
    case 'order-detail':
      return [
        base,
        { label: 'Hesab', to: ROUTES.ACCOUNT },
        { label: 'Sifarişlərim', to: ROUTES.ORDERS },
        { label: `№ ${String(route.params.orderId ?? '')}`, to: undefined },
      ];
    case 'profile':
      return [
        base,
        { label: 'Hesab', to: ROUTES.ACCOUNT },
        { label: 'Profil parametrləri', to: undefined },
      ];
    case 'contact':
      return [base, { label: 'Əlaqə', to: undefined }];
    case 'special-offers':
      return [];
    case 'notifications':
      return [
        base,
        { label: 'Hesab', to: ROUTES.ACCOUNT },
        { label: 'Bildirişlər', to: undefined },
      ];
    case 'settings':
      return [base, { label: 'Parametrlər', to: undefined }];
    case 'catch-all':
      return [base, { label: 'Tapılmadı', to: undefined }];
    default:
      return [base, { label: (route.meta.title as string) ?? 'Səhifə', to: undefined }];
  }
}
