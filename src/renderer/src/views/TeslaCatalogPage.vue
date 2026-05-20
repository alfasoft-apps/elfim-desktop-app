<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { searchProductNamesByCodeList } from '../api/elfim-api';
import type { ProductListItem, TeslaCarSpec } from '../api/types';
import ProductCard from '../components/ProductCard.vue';
import ProductCardSkeleton from '../components/ProductCardSkeleton.vue';
import { PRODUCT_CARD_GRID_CLASS } from '../constants/product-grid';
import { getTeslaEngines, getTeslaMakes, getTeslaModels, teslaCodesCsv, type TeslaRoot } from '../catalog/tesla-json';

const root = ref<TeslaRoot | null>(null);
const loadErr = ref<string | null>(null);

const make = ref('');
const model = ref('');
const engines = ref<TeslaCarSpec[]>([]);
/** Seçilmiş motor indeksi; -1 boş seçim. */
const engineIdx = ref(-1);

const loadingProducts = ref(false);
const productErr = ref<string | null>(null);
const results = ref<ProductListItem[]>([]);
const GRID_SKELETON_COUNT = 12;

const makes = computed(() => (root.value ? getTeslaMakes(root.value) : []));
const models = computed(() =>
  root.value && make.value ? getTeslaModels(root.value, make.value) : [],
);

onMounted(async () => {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const res = await fetch(`${base}data/tesla.json`);
    if (!res.ok) throw new Error(`JSON yüklənmədi (${res.status})`);
    root.value = (await res.json()) as TeslaRoot;
  } catch (e) {
    loadErr.value = e instanceof Error ? e.message : 'Tesla kataloqu oxunmadı.';
  }
});

watch(make, (v) => {
  model.value = '';
  engines.value = [];
  engineIdx.value = -1;
  results.value = [];
  if (!v || !root.value) return;
});

watch(model, (v) => {
  engines.value = [];
  engineIdx.value = -1;
  results.value = [];
  if (!v || !root.value || !make.value) return;
  engines.value = getTeslaEngines(root.value, make.value, v);
});

watch(engineIdx, async (idx) => {
  results.value = [];
  productErr.value = null;
  if (idx < 0 || !engines.value[idx]) return;
  const spec = engines.value[idx];
  const csv = teslaCodesCsv(spec);
  loadingProducts.value = true;
  try {
    results.value = await searchProductNamesByCodeList(csv);
    if (results.value.length === 0) productErr.value = 'Məhsul tapılmadı.';
  } catch (e) {
    productErr.value = e instanceof Error ? e.message : 'API xətası.';
  } finally {
    loadingProducts.value = false;
  }
});
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <section class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-zinc-900">Babin</h2>
      <p class="mt-2 text-sm text-zinc-600">Marka, model və motor seçin; uyğun məhsullar göstərilir.</p>
      <p v-if="loadErr" class="mt-3 text-sm text-red-600">{{ loadErr }}</p>

      <div v-if="root" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label class="block text-xs font-medium text-zinc-700">
          Marka
          <select v-model="make" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm">
            <option value="">—</option>
            <option v-for="m in makes" :key="m" :value="m">{{ m }}</option>
          </select>
        </label>
        <label class="block text-xs font-medium text-zinc-700">
          Model
          <select
            v-model="model"
            class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
            :disabled="!make"
          >
            <option value="">—</option>
            <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
          </select>
        </label>
        <label class="block text-xs font-medium text-zinc-700">
          Motor / babin
          <select
            v-model.number="engineIdx"
            class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
            :disabled="!model || engines.length === 0"
          >
            <option :value="-1">—</option>
            <option v-for="(eng, idx) in engines" :key="idx" :value="idx">{{ eng.displayLabel }}</option>
          </select>
        </label>
      </div>
      <p v-if="productErr" class="mt-2 text-sm text-amber-700">{{ productErr }}</p>
    </section>

    <div v-if="loadingProducts" :class="PRODUCT_CARD_GRID_CLASS" aria-busy="true">
      <ProductCardSkeleton v-for="n in GRID_SKELETON_COUNT" :key="'tesla-sk-' + n" variant="catalog" />
    </div>

    <div v-else-if="results.length" :class="PRODUCT_CARD_GRID_CLASS">
      <ProductCard v-for="p in results" :key="p.id" :product="p" />
    </div>
  </div>
</template>
