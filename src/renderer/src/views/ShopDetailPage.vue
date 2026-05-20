<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { scrollAppMainToTopAfterPaint } from '../utils/scroll-app-main';
import { useRoute } from 'vue-router';
import { fetchShopProducts } from '../api/elfim-api';
import type { ProductListItem } from '../api/types';
import ProductCard from '../components/ProductCard.vue';
import ProductCardSkeleton from '../components/ProductCardSkeleton.vue';
import { PRODUCT_CARD_GRID_CLASS } from '../constants/product-grid';

const route = useRoute();
const slug = computed(() => String(route.params.slug ?? ''));

const loading = ref(true);
const error = ref<string | null>(null);
const products = ref<ProductListItem[]>([]);
const currentPage = ref(1);
const lastPage = ref(1);
const PAGE_SIZE = 15;

async function load(page = 1) {
  if (!slug.value) return;
  loading.value = true;
  error.value = null;
  products.value = [];
  try {
    const res = await fetchShopProducts(slug.value, page, PAGE_SIZE);
    products.value = res.data;
    currentPage.value = res.meta?.current_page ?? page;
    lastPage.value = res.meta?.last_page ?? 1;
    await nextTick();
    scrollAppMainToTopAfterPaint('instant');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Məhsullar yüklənmədi.';
    products.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => load(1));
watch(slug, () => load(1));

function prevPage() {
  if (currentPage.value > 1) load(currentPage.value - 1);
}

function nextPage() {
  if (currentPage.value < lastPage.value) load(currentPage.value + 1);
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <section class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p class="text-xs font-medium uppercase tracking-wide text-emerald-700">Mağaza məhsulları</p>
      <h2 class="mt-2 text-xl font-semibold tracking-tight text-zinc-900">{{ slug }}</h2>
      <p class="mt-2 text-sm text-zinc-600">Bu mağazanın məhsul siyahısı.</p>
      <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    </section>

    <div v-if="products.length" class="flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        class="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-40"
        :disabled="loading || currentPage <= 1"
        @click="prevPage"
      >
        Əvvəl
      </button>
      <button
        type="button"
        class="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-40"
        :disabled="loading || currentPage >= lastPage"
        @click="nextPage"
      >
        Sonra
      </button>
      <span class="text-zinc-600">Səhifə {{ currentPage }} / {{ lastPage }}</span>
    </div>

    <div v-if="loading" :class="PRODUCT_CARD_GRID_CLASS" aria-busy="true">
      <ProductCardSkeleton v-for="n in PAGE_SIZE" :key="'shop-sk-' + n" variant="catalog" />
    </div>

    <div v-else-if="products.length" :class="PRODUCT_CARD_GRID_CLASS">
      <ProductCard v-for="p in products" :key="p.id" :product="p" />
    </div>
  </div>
</template>
