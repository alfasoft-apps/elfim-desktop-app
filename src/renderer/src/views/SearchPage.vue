<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { searchOem } from '../api/elfim-api';
import type { ProductListItem } from '../api/types';
import ProductCard from '../components/ProductCard.vue';
import ProductCardSkeleton from '../components/ProductCardSkeleton.vue';
import { PRODUCT_CARD_GRID_CLASS } from '../constants/product-grid';
import { usePublicSearchQueryStore } from '../stores/publicSearchQuery';
import { nextTick, ref } from 'vue';
import { scrollAppMainToTopAfterPaint } from '../utils/scroll-app-main';

const searchStore = usePublicSearchQueryStore();
const { oemQuery } = storeToRefs(searchStore);

const loading = ref(false);
const error = ref<string | null>(null);
const results = ref<ProductListItem[]>([]);
const currentPage = ref(1);
const lastPage = ref(1);
const PAGE_SIZE = 15;

async function runSearch(page = 1) {
  if (!oemQuery.value.trim()) {
    error.value = 'OEM və ya açar söz daxil edin.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const pageResult = await searchOem(oemQuery.value, page, PAGE_SIZE);
    results.value = pageResult.data;
    currentPage.value = pageResult.meta?.current_page ?? page;
    lastPage.value = pageResult.meta?.last_page ?? 1;
    await nextTick();
    scrollAppMainToTopAfterPaint('instant');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Axtarış alınmadı.';
    results.value = [];
  } finally {
    loading.value = false;
  }
}

function prevPage() {
  if (currentPage.value > 1) runSearch(currentPage.value - 1);
}

function nextPage() {
  if (currentPage.value < lastPage.value) runSearch(currentPage.value + 1);
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <section class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-zinc-900">Axtarış</h2>
      <p class="mt-2 text-sm text-zinc-600">OEM kodu və ya açar söz ilə məhsul axtarın.</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <input
          v-model="oemQuery"
          type="search"
          class="min-w-[200px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
          placeholder="OEM və ya kod…"
          @keyup.enter="runSearch(1)"
        />
        <button
          type="button"
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          :disabled="loading"
          @click="runSearch(1)"
        >
          {{ loading ? '…' : 'Axtar' }}
        </button>
      </div>
      <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    </section>

    <div v-if="results.length && lastPage > 1" class="flex flex-wrap items-center gap-2 text-sm">
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
      <ProductCardSkeleton v-for="n in PAGE_SIZE" :key="'search-sk-' + n" variant="catalog" />
    </div>

    <div v-else-if="results.length" :class="PRODUCT_CARD_GRID_CLASS">
      <ProductCard v-for="p in results" :key="p.id" :product="p" />
    </div>
  </div>
</template>
