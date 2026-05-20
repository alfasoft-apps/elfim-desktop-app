<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { fetchCategories, fetchProductsByType } from '../api/elfim-api';
import type { CategoryItem, ProductListItem } from '../api/types';
import ProductCard from '../components/ProductCard.vue';
import ProductCardSkeleton from '../components/ProductCardSkeleton.vue';
import { PRODUCT_CARD_GRID_CLASS } from '../constants/product-grid';
import { ROUTES } from '../constants/routes';

const loading = ref(true);
const error = ref<string | null>(null);

const newProducts = ref<ProductListItem[]>([]);
const popularProducts = ref<ProductListItem[]>([]);
const saleProducts = ref<ProductListItem[]>([]);
const categories = ref<CategoryItem[]>([]);

const FEED_PAGE = 12;

const quickLinks: { label: string; to: string }[] = [
  { label: 'Axtarış', to: ROUTES.SEARCH },
  { label: 'Mağazalar', to: ROUTES.SHOPS },
  { label: 'Şam (BRISK)', to: ROUTES.CATALOG_BRISK },
  { label: 'Babin', to: ROUTES.CATALOG_TESLA },
  { label: 'Səbət', to: ROUTES.CART },
  { label: 'Ödəniş', to: ROUTES.CHECKOUT },
  { label: 'Əlaqə', to: ROUTES.CONTACT },
  { label: 'Hesab', to: ROUTES.ACCOUNT },
];

const feedTitles = ['Yeni gələnlər', 'Populyar', 'Endirimdə'] as const;

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const [n, p, s, c] = await Promise.all([
      fetchProductsByType(1, FEED_PAGE, 'new'),
      fetchProductsByType(1, FEED_PAGE, 'popular'),
      fetchProductsByType(1, FEED_PAGE, 'onsale'),
      fetchCategories(),
    ]);
    newProducts.value = n.data;
    popularProducts.value = p.data;
    saleProducts.value = s.data;
    categories.value = c;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Məlumat yüklənmədi.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-10">
    <p v-if="error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {{ error }}
    </p>

    <section class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-zinc-900">Ana səhifə</h2>
      <p class="mt-2 text-sm leading-relaxed text-zinc-600">
        Yeni gələnlər, populyar və endirimdə olan məhsullar, eləcə də kateqoriyalar.
      </p>
    </section>

    <section v-if="loading" aria-busy="true">
      <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Kateqoriyalar</h3>
      <div class="flex flex-wrap gap-2">
        <div v-for="n in 10" :key="'cat-sk-' + n" class="h-8 w-28 animate-pulse rounded-full bg-zinc-200/80" />
      </div>

      <div v-for="(title, idx) in feedTitles" :key="'feed-sk-' + idx" class="mt-10">
        <div class="mb-4 h-6 w-44 animate-pulse rounded-lg bg-zinc-200" />
        <div :class="PRODUCT_CARD_GRID_CLASS">
          <ProductCardSkeleton v-for="n in FEED_PAGE" :key="'fd-' + idx + '-' + n" variant="catalog" />
        </div>
      </div>
    </section>

    <template v-else>
      <section v-if="categories.length" id="home-categories">
        <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Kateqoriyalar</h3>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="cat in categories"
            :key="cat.id"
            class="rounded-full bg-white px-3 py-1.5 text-sm text-zinc-700 ring-1 ring-zinc-200"
          >
            {{ cat.name }}
          </span>
        </div>
      </section>

      <section v-for="block in [
        { title: 'Yeni gələnlər', list: newProducts },
        { title: 'Populyar', list: popularProducts },
        { title: 'Endirimdə', list: saleProducts },
      ]" :key="block.title">
        <h3 class="mb-4 text-base font-semibold text-zinc-900">{{ block.title }}</h3>
        <div v-if="block.list.length === 0" class="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-500">
          Məhsul yoxdur.
        </div>
        <div v-else :class="PRODUCT_CARD_GRID_CLASS">
          <ProductCard v-for="p in block.list" :key="p.id" :product="p" />
        </div>
      </section>
    </template>

    <section>
      <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Tez keçidlər</h3>
      <div class="flex flex-wrap gap-2">
        <RouterLink
          v-for="link in quickLinks"
          :key="link.to"
          :to="link.to"
          class="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-emerald-300 hover:text-emerald-900"
        >
          {{ link.label }}
        </RouterLink>
      </div>
    </section>
  </div>
</template>
