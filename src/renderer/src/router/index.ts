import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHashHistory } from 'vue-router';
import { ROUTES } from '../constants/routes';
import { readLicenseConfigGate, clearLicenseConfigGate } from '../utils/license-config-gate';
import { useSessionAuthStore } from '../stores/sessionAuth';

const lazy = {
  LandingPage: () => import('../views/LandingPage.vue'),
  HomePage: () => import('../views/HomePage.vue'),
  SearchPage: () => import('../views/SearchPage.vue'),
  ShopsPage: () => import('../views/ShopsPage.vue'),
  ShopDetailPage: () => import('../views/ShopDetailPage.vue'),
  BriskCatalogPage: () => import('../views/BriskCatalogPage.vue'),
  TeslaCatalogPage: () => import('../views/TeslaCatalogPage.vue'),
  ProductDetailPage: () => import('../views/ProductDetailPage.vue'),
  CartPage: () => import('../views/CartPage.vue'),
  CheckoutPage: () => import('../views/CheckoutPage.vue'),
  CompleteOrderPage: () => import('../views/CompleteOrderPage.vue'),
  SignInPage: () => import('../views/SignInPage.vue'),
  AccountPage: () => import('../views/AccountPage.vue'),
  OrdersPage: () => import('../views/OrdersPage.vue'),
  OrderDetailPage: () => import('../views/OrderDetailPage.vue'),
  ProfilePage: () => import('../views/ProfilePage.vue'),
  LicenseProfilePage: () => import('../views/LicenseProfilePage.vue'),
  ContactPage: () => import('../views/ContactPage.vue'),
  SettingsPage: () => import('../views/SettingsPage.vue'),
  NotificationsPage: () => import('../views/NotificationsPage.vue'),
  SpecialOffersRoutePage: () => import('../views/SpecialOffersRoutePage.vue'),
  NotFoundPage: () => import('../views/NotFoundPage.vue'),
};

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: lazy.LandingPage,
    meta: { title: 'Əsas səhifə' },
  },
  { path: '/search', name: 'search', component: lazy.SearchPage, meta: { title: 'Axtarış' } },
  { path: '/shops', name: 'shops', component: lazy.ShopsPage, meta: { title: 'Mağazalar' } },
  {
    path: '/shops/:slug',
    name: 'shop-detail',
    component: lazy.ShopDetailPage,
    meta: { title: 'Mağaza' },
  },
  {
    path: '/catalog/brisk',
    name: 'catalog-brisk',
    component: lazy.BriskCatalogPage,
    meta: { title: 'Şam (BRISK)' },
  },
  {
    path: '/catalog/tesla',
    name: 'catalog-tesla',
    component: lazy.TeslaCatalogPage,
    meta: { title: 'Babin' },
  },
  {
    path: '/products/:slug',
    name: 'product-detail',
    component: lazy.ProductDetailPage,
    meta: { title: 'Məhsul' },
  },
  { path: '/cart', name: 'cart', component: lazy.CartPage, meta: { title: 'Səbət' } },
  { path: '/checkout', name: 'checkout', component: lazy.CheckoutPage, meta: { title: 'Ödəniş' } },
  {
    path: '/complete-order',
    name: 'complete-order',
    component: lazy.CompleteOrderPage,
    meta: { title: 'Sifariş tamamlandı' },
  },
  {
    path: '/signin',
    name: 'signin',
    component: lazy.SignInPage,
    meta: { title: 'Daxil ol', public: true },
  },
  { path: '/account', name: 'account', component: lazy.AccountPage, meta: { title: 'Hesab' } },
  {
    path: '/account/orders',
    name: 'orders',
    component: lazy.OrdersPage,
    meta: { title: 'Sifarişlərim' },
  },
  {
    path: '/account/orders/:orderId',
    name: 'order-detail',
    component: lazy.OrderDetailPage,
    meta: { title: 'Sifariş' },
  },
  {
    path: '/account/profile',
    name: 'profile',
    component: lazy.ProfilePage,
    meta: { title: 'Profil parametrləri' },
  },
  {
    path: ROUTES.LICENSE_PROFILE,
    name: 'license-profile',
    component: lazy.LicenseProfilePage,
    meta: { title: 'Profil və lisenziya', licenseConfigLock: true },
  },
  { path: '/contact', name: 'contact', component: lazy.ContactPage, meta: { title: 'Əlaqə' } },
  {
    path: '/special-offers',
    name: 'special-offers',
    component: lazy.SpecialOffersRoutePage,
    meta: { title: 'Əsas səhifə' },
  },
  {
    path: '/notifications',
    name: 'notifications',
    component: lazy.NotificationsPage,
    meta: { title: 'Bildirişlər' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: lazy.SettingsPage,
    meta: { title: 'Parametrlər' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'catch-all',
    component: lazy.NotFoundPage,
    meta: { title: 'Tapılmadı' },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0, left: 0 };
  },
});

router.beforeEach((to) => {
  const licensePath = ROUTES.LICENSE_PROFILE;

  if (readLicenseConfigGate()) {
    if (to.path !== licensePath) {
      return { path: licensePath, replace: true };
    }
    return true;
  }

  if (to.path === licensePath) {
    return { path: '/', replace: true };
  }

  const auth = useSessionAuthStore();
  if (to.meta.public) {
    if (auth.isAuthenticated && to.name === 'signin') {
      const redir = to.query.redirect;
      const path = typeof redir === 'string' && redir.startsWith('/') ? redir : '/';
      return { path };
    }
    return true;
  }
  if (!auth.isAuthenticated) {
    return { name: 'signin', query: { redirect: to.fullPath } };
  }
  return true;
});

router.afterEach((to) => {
  const title = (to.meta.title as string) ?? 'Elfim Auto';
  document.title = `${title} · Elfim Auto`;
});

export default router;
