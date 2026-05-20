<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { RouterView, useRoute } from 'vue-router';
import { useSessionAuthStore } from '../../stores/sessionAuth';
import BottomNav from './BottomNav.vue';
import SpecialOffersStoriesHost from './SpecialOffersStoriesHost.vue';
import CartDrawer from './CartDrawer.vue';
import NavDrawer from './NavDrawer.vue';
import AppBreadcrumb from './AppBreadcrumb.vue';
import { useShoppingCartStore } from '../../stores/shoppingCart';
import CacheSyncProgressBar from '../CacheSyncProgressBar.vue';
import NetworkStatusBanner from '../NetworkStatusBanner.vue';
import { useAppDataCacheStore } from '../../stores/appDataCache';
import { useNetworkStatusStore } from '../../stores/networkStatus';
import { syncLicenseFingerprintFromSession } from '../../utils/license-fingerprint-sync';
import { isLicenseConfigGateActive } from '../../utils/license-config-gate';
import { APP_MAIN_SCROLL_ID } from '../../utils/scroll-app-main';

const route = useRoute();
const sessionAuth = useSessionAuthStore();
const { isAuthenticated } = storeToRefs(sessionAuth);

const pageTitle = computed(() => (route.meta.title as string) ?? 'Elfim Auto');

/** Lisenziya konfiqurasiya kilidi — yalnız tək məlumat səhifəsi; nav və sinxron dayandırılır. */
const licenseConfigLock = computed(() => Boolean(route.meta.licenseConfigLock));

/** Giriş olunmayıb — əsas nav, keş sinxronu və banner API çağırışları göstərilmir / işlədilmir. */
const showAppChrome = computed(() => isAuthenticated.value && !licenseConfigLock.value);

const appDataCache = useAppDataCacheStore();
const { syncing } = storeToRefs(appDataCache);
const networkStatus = useNetworkStatusStore();

const headerSubtitle = computed(() => {
  if (licenseConfigLock.value) return '';
  if (!networkStatus.isOnline) {
    const n = appDataCache.displayProductCount;
    return n > 0 ? `Oflayn · keş (${n} məhsul)` : 'Oflayn · keş rejimi';
  }
  if (appDataCache.lastFetchSource === 'disk') return 'Son cavab: yerli keş';
  if (appDataCache.lastFetchSource === 'network') return 'Canlı məlumat';
  return '';
});

const mainScroll = ref<HTMLElement | null>(null);

const navOpen = ref(false);
const cartOpen = ref(false);

const cart = useShoppingCartStore();
cart.hydrateFromStorage();

onMounted(() => {
  networkStatus.startMonitoring();
});

watch(
  isAuthenticated,
  (ok) => {
    if (!ok) return;
    if (isLicenseConfigGateActive()) return;
    void syncLicenseFingerprintFromSession();
    void (async () => {
      await appDataCache.loadFromDisk();
      if (networkStatus.isOnline) await appDataCache.syncBundle();
    })();
    void import('../../views/CartPage.vue');
  },
  { immediate: true },
);

watch(
  () => networkStatus.isOnline,
  (online) => {
    if (online && isAuthenticated.value && !isLicenseConfigGateActive()) {
      void appDataCache.syncBundle(true);
    }
  },
);

watch(
  () => route.fullPath,
  () => {
    navOpen.value = false;
    requestAnimationFrame(() => {
      mainScroll.value?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  },
);
</script>

<template>
  <div class="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 antialiased">
    <header
      class="sticky top-0 z-30 flex min-h-14 shrink-0 flex-col justify-center gap-0.5 border-b border-zinc-200 bg-white/90 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/75"
    >
      <h1 class="truncate text-lg font-semibold tracking-tight text-zinc-900">{{ pageTitle }}</h1>
      <p v-if="showAppChrome && headerSubtitle" class="truncate text-xs font-medium text-zinc-500">
        {{ headerSubtitle }}
      </p>
    </header>

    <main
      :id="APP_MAIN_SCROLL_ID"
      ref="mainScroll"
      class="min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-6 transition-[padding-bottom] duration-200"
      :class="
        !showAppChrome ? 'pb-6' : syncing ? 'pb-48 sm:pb-52' : 'pb-28'
      "
    >
      <AppBreadcrumb v-if="showAppChrome" />
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <SpecialOffersStoriesHost v-if="showAppChrome" />
    <div v-if="showAppChrome" class="fixed bottom-0 left-0 right-0 z-40 flex flex-col">
      <CacheSyncProgressBar />
      <BottomNav @open-menu="navOpen = true" @open-cart="cartOpen = true" />
    </div>
    <NavDrawer v-if="showAppChrome" :open="navOpen" @update:open="navOpen = $event" />
    <CartDrawer v-if="showAppChrome" :open="cartOpen" @update:open="cartOpen = $event" />
    <NetworkStatusBanner />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
