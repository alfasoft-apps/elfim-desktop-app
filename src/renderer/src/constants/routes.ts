/** Tətbiq daxili marşrut sabitləri. */
export const ROUTES = {
  HOME: '/',
  SEARCH: '/search',
  SHOPS: '/shops',
  SHOP: (slug: string) => `/shops/${encodeURIComponent(slug)}`,
  CATALOG_BRISK: '/catalog/brisk',
  CATALOG_TESLA: '/catalog/tesla',
  PRODUCT: (slug: string) => `/products/${encodeURIComponent(slug)}`,
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDER_COMPLETE: '/complete-order',
  SIGNIN: '/signin',
  ACCOUNT: '/account',
  ORDERS: '/account/orders',
  ORDER: (id: string) => `/account/orders/${encodeURIComponent(id)}`,
  PROFILE: '/account/profile',
  /** Server tərəfdə fingerprint_token yanlış olanda kilidlənmiş tək məlumat səhifəsi */
  LICENSE_PROFILE: '/account/license-info',
  CONTACT: '/contact',
  SETTINGS: '/settings',
  SPECIAL_OFFERS: '/special-offers',
  NOTIFICATIONS: '/notifications',
} as const;
