<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { RouterLink, useRoute } from 'vue-router';
import { ROUTES } from '../../constants/routes';
import { useCartHintStore } from '../../stores/cartHint';
import { useSessionAuthStore } from '../../stores/sessionAuth';
import { useAppDataCacheStore } from '../../stores/appDataCache';
import { useNetworkStatusStore } from '../../stores/networkStatus';
import { useSpecialOffersMetaStore } from '../../stores/specialOffersMeta';

const emit = defineEmits<{
  openMenu: [];
  openCart: [];
}>();

const route = useRoute();
const cartHint = useCartHintStore();
const { totalItems } = storeToRefs(cartHint);
const auth = useSessionAuthStore();
const { isAuthenticated } = storeToRefs(auth);
const network = useNetworkStatusStore();
const appCache = useAppDataCacheStore();
const { isOnline } = storeToRefs(network);
const { displayProductCount, lastFetchSource } = storeToRefs(appCache);
const offersMeta = useSpecialOffersMetaStore();
const { showNewBadge } = storeToRefs(offersMeta);

const modeFootnote = computed(() => {
  if (!isOnline.value) {
    const n = displayProductCount.value;
    return n > 0 ? `Oflayn · keş · ${n} məhs.` : 'Oflayn · keş';
  }
  if (lastFetchSource.value === 'disk') return 'Son məlumat: keş';
  if (lastFetchSource.value === 'network') return 'Canlı məlumat';
  return '';
});

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/' || route.path === '';
  return route.path === path || route.path.startsWith(`${path}/`);
}

function openSpecialOffersStories() {
  window.dispatchEvent(new CustomEvent('show-banners'));
}

onMounted(() => {
  void offersMeta.refresh();
});

watch(isOnline, (online) => {
  if (online) void offersMeta.refresh(true);
});
</script>

<template>
  <nav
    class="w-full border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    aria-label="Əsas naviqasiya"
  >
    <div class="mx-auto grid max-w-6xl grid-cols-6 items-end gap-0.5 px-1 pt-2 sm:gap-1 sm:px-2">
      <button
        type="button"
        class="flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-zinc-600 transition hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.97]"
        aria-label="Menyu"
        @click="emit('openMenu')"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
        <span class="max-w-full truncate text-[10px] font-medium leading-tight">Menyu</span>
      </button>

      <RouterLink
        :to="ROUTES.SEARCH"
        class="flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 transition hover:bg-emerald-50 active:scale-[0.97]"
        :class="isActive('/search') ? 'text-emerald-700' : 'text-zinc-600 hover:text-emerald-700'"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span class="max-w-full truncate text-[10px] font-medium leading-tight">Axtarış</span>
      </RouterLink>

      <RouterLink
        :to="ROUTES.HOME"
        class="flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 transition hover:bg-emerald-50 active:scale-[0.97]"
        :class="isActive('/') ? 'text-emerald-700' : 'text-zinc-600 hover:text-emerald-700'"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        <span class="max-w-full truncate text-[10px] font-medium leading-tight">Əsas</span>
      </RouterLink>

      <button
        type="button"
        class="flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-zinc-600 transition hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.97]"
        aria-label="Xüsusi təkliflər"
        @click="openSpecialOffersStories"
      >
        <span class="relative inline-flex items-center justify-center">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01"
            />
          </svg>
          <span
            v-if="showNewBadge"
            class="absolute left-[calc(50%+8px)] top-0 z-10 -translate-y-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-1 py-px text-[8px] font-bold uppercase leading-none text-white shadow-sm"
          >
            Yeni
          </span>
        </span>
        <span class="max-w-full truncate text-[10px] font-medium leading-tight">Təkliflər</span>
      </button>

      <button
        type="button"
        class="flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-zinc-600 transition hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.97]"
        aria-label="Səbət"
        @click="emit('openCart')"
      >
        <span class="relative mx-auto inline-flex items-center justify-center">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <span
            v-if="totalItems > 0"
            class="absolute left-[calc(50%+7px)] top-0 z-10 flex min-h-4 min-w-4 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-600 px-0.5 text-[10px] font-bold leading-none text-white"
          >
            {{ totalItems > 99 ? '99+' : totalItems }}
          </span>
        </span>
        <span class="max-w-full truncate text-[10px] font-medium leading-tight">Səbət</span>
      </button>

      <RouterLink
        :to="isAuthenticated ? ROUTES.ACCOUNT : ROUTES.SIGNIN"
        class="flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 transition hover:bg-emerald-50 active:scale-[0.97]"
        :class="
          isActive('/account') || isActive('/signin')
            ? 'text-emerald-700'
            : 'text-zinc-600 hover:text-emerald-700'
        "
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span class="max-w-full truncate text-[10px] font-medium leading-tight">{{ isAuthenticated ? 'Hesab' : 'Giriş' }}</span>
      </RouterLink>
    </div>
    <p
      v-if="modeFootnote"
      class="mx-auto max-w-6xl truncate px-3 pb-1.5 pt-0.5 text-center text-[10px] font-medium text-zinc-500"
    >
      {{ modeFootnote }}
    </p>
  </nav>
</template>
