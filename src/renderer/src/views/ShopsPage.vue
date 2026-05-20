<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
import { RouterLink } from 'vue-router';
import { fetchShops } from '../api/elfim-api';
import type { ShopListItem } from '../api/types';
import ShopLogoThumb from '../components/ShopLogoThumb.vue';
import { ROUTES } from '../constants/routes';

const shops = shallowRef<ShopListItem[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const skeletonPlaceholders = 8;

/** Loqo URL bir dəfə hesablanır — hər renderdə təkrar işə düşməsin. */
const rows = computed(() => shops.value.map((shop) => ({ shop })));

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    shops.value = await fetchShops();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Mağazalar yüklənmədi.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <section class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-zinc-900">Mağazalar</h2>
      <p class="mt-2 text-sm text-zinc-600">Partnyor mağazaların siyahısı.</p>
      <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    </section>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2">
      <div
        v-for="n in skeletonPlaceholders"
        :key="`sk-${n}`"
        class="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <div class="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-zinc-200" />
        <div class="min-w-0 flex-1 space-y-2.5 py-0.5">
          <div class="h-4 w-2/3 max-w-[12rem] animate-pulse rounded-md bg-zinc-200" />
          <div class="h-3 w-full animate-pulse rounded-md bg-zinc-100" />
          <div class="h-3 w-4/5 animate-pulse rounded-md bg-zinc-100" />
          <div class="h-3 w-20 animate-pulse rounded-md bg-zinc-100/80" />
        </div>
      </div>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <RouterLink
        v-for="row in rows"
        v-memo="[row.shop.id, row.shop.logo, row.shop.title, row.shop.product_count, row.shop.shop_information_inline, row.shop.slug]"
        :key="row.shop.id"
        :to="row.shop.slug ? ROUTES.SHOP(row.shop.slug) : '/'"
        class="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-300"
      >
        <ShopLogoThumb :src="row.shop.logo" :alt="row.shop.title ?? ''" />
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-zinc-900">{{ row.shop.title }}</p>
          <p
            v-if="row.shop.shop_information_inline"
            class="mt-1 line-clamp-2 text-xs text-zinc-500"
          >
            {{ row.shop.shop_information_inline }}
          </p>
          <p class="mt-2 text-xs text-zinc-400">{{ row.shop.product_count }} məhsul</p>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
