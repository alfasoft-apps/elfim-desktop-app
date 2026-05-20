<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { searchCodeListGrouped } from '../api/elfim-api';
import type { ProductGroupSection, ProductListItem } from '../api/types';
import ProductCard from '../components/ProductCard.vue';
import ProductCardSkeleton from '../components/ProductCardSkeleton.vue';
import { PRODUCT_CARD_GRID_CLASS } from '../constants/product-grid';
import {
  getBriskBrands,
  getBriskCodes,
  getBriskModelRanges,
  getBriskModels,
  getBriskVolumes,
  type BriskRoot,
} from '../catalog/brisk-json';
import { ROUTES } from '../constants/routes';

const root = ref<BriskRoot | null>(null);
const loadErr = ref<string | null>(null);

const brand = ref('');
const modelRange = ref('');
const model = ref('');
const volume = ref('');

const loadingSearch = ref(false);
const searchErr = ref<string | null>(null);
const sections = ref<ProductGroupSection[]>([]);
const GRID_SKELETON_COUNT = 12;

const brands = computed(() => (root.value ? getBriskBrands(root.value) : []));
const modelRanges = computed(() =>
  root.value && brand.value ? getBriskModelRanges(root.value, brand.value) : [],
);
const models = computed(() =>
  root.value && brand.value && modelRange.value
    ? getBriskModels(root.value, brand.value, modelRange.value)
    : [],
);
const volumes = computed(() =>
  root.value && brand.value && modelRange.value && model.value
    ? getBriskVolumes(root.value, brand.value, modelRange.value, model.value)
    : [],
);

onMounted(async () => {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const res = await fetch(`${base}data/catalogue_cars_en.json`);
    if (!res.ok) throw new Error(`JSON yüklənmədi (${res.status})`);
    root.value = (await res.json()) as BriskRoot;
  } catch (e) {
    loadErr.value = e instanceof Error ? e.message : 'Kataloq faylı oxunmadı.';
  }
});

watch(brand, () => {
  modelRange.value = '';
  model.value = '';
  volume.value = '';
  sections.value = [];
});
watch(modelRange, () => {
  model.value = '';
  volume.value = '';
  sections.value = [];
});
watch(model, () => {
  volume.value = '';
  sections.value = [];
});

watch(volume, async (v) => {
  sections.value = [];
  searchErr.value = null;
  if (!v || !root.value || !brand.value || !modelRange.value || !model.value) return;
  const codes = getBriskCodes(root.value, brand.value, modelRange.value, model.value, v);
  if (!codes?.length) {
    searchErr.value = 'Kataloqda kod tapılmadı.';
    return;
  }
  loadingSearch.value = true;
  try {
    const csv = codes.join(',');
    sections.value = await searchCodeListGrouped(csv);
    if (sections.value.length === 0) searchErr.value = 'Məhsul tapılmadı.';
  } catch (e) {
    searchErr.value = e instanceof Error ? e.message : 'API xətası.';
    sections.value = [];
  } finally {
    loadingSearch.value = false;
  }
});

function asCard(p: ProductListItem) {
  return p;
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <section class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-zinc-900">Şam (BRISK)</h2>
      <p class="mt-2 text-sm text-zinc-600">Avtomobil parametrlərini seçin; uyğun məhsullar göstərilir.</p>
      <p v-if="loadErr" class="mt-3 text-sm text-red-600">{{ loadErr }}</p>

      <div v-if="root" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label class="block text-xs font-medium text-zinc-700">
          Brend
          <select
            v-model="brand"
            class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
          >
            <option value="">—</option>
            <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
          </select>
        </label>
        <label class="block text-xs font-medium text-zinc-700">
          Model sırası
          <select
            v-model="modelRange"
            class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
            :disabled="!brand"
          >
            <option value="">—</option>
            <option v-for="m in modelRanges" :key="m" :value="m">{{ m }}</option>
          </select>
        </label>
        <label class="block text-xs font-medium text-zinc-700">
          Model
          <select
            v-model="model"
            class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
            :disabled="!modelRange"
          >
            <option value="">—</option>
            <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
          </select>
        </label>
        <label class="block text-xs font-medium text-zinc-700">
          Həcm
          <select
            v-model="volume"
            class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
            :disabled="!model"
          >
            <option value="">—</option>
            <option v-for="v in volumes" :key="v" :value="v">{{ v }}</option>
          </select>
        </label>
      </div>
      <p v-if="searchErr" class="mt-2 text-sm text-amber-700">{{ searchErr }}</p>
    </section>

    <div v-if="loadingSearch" :class="[PRODUCT_CARD_GRID_CLASS, 'mt-4']" aria-busy="true">
      <ProductCardSkeleton v-for="n in GRID_SKELETON_COUNT" :key="'brisk-sk-' + n" variant="catalog" />
    </div>

    <section v-for="sec in sections" :key="sec.title" class="space-y-4">
      <h3 class="text-base font-semibold text-zinc-900">{{ sec.title }}</h3>
      <div :class="PRODUCT_CARD_GRID_CLASS">
        <ProductCard v-for="p in sec.items" :key="p.id" :product="asCard(p)" />
      </div>
    </section>
  </div>
</template>
