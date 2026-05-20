/** Backend REST endpoint yolları. */
export const API_ENDPOINTS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  ME: 'me',
  PRODUCTS: 'products',
  PRODUCT: 'product',
  CATEGORIES: 'categories',
  SEARCH_OEM: 'search-oem',
  SEARCH_CODE_LIST: 'search-code-list',
  SEARCH_PRODUCT_NAME_BY_LIST: 'search-product-name-by-list',
  MY_SHOPPING_CART: 'my-shopping-cart',
  MY_SHOPPING_CART_ADD: 'my-shopping-cart/add',
  MY_SHOPPING_CART_CLEAR_ONE: 'my-shopping-cart/clear-one',
  MY_SHOPPING_CART_CLEAR_ALL: 'my-shopping-cart/clear-all',
  MY_ADDRESSES: 'my-addresses',
  MY_ORDERS: 'my-orders',
  MANUFACTURING_FIRMS: 'manufacturing-firms',
  COMPANY_PHONE_NUMBERS: 'company-phone-numbers',
  /** Vahid oflayn keş paketi (categories, shops, products, profile, orders, …). */
  DESKTOP_APP_BUNDLE: 'desktop-app-bundle',
  BANNERS: 'banners',
  MY_NOTIFICATIONS: 'my-notifications',
} as const;
