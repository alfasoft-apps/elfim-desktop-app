<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { fetchProductDetail } from '../api/elfim-api';
import type { ProductDetailEnvelope, ProductListItem } from '../api/types';
import ProductCard from '../components/ProductCard.vue';
import ProductDetailSkeleton from '../components/ProductDetailSkeleton.vue';
import ProductDetailGallery from '../components/ProductDetailGallery.vue';
import ProductDetailQtyCounter from '../components/ProductDetailQtyCounter.vue';
import ProductDetailsDataTable from '../components/ProductDetailsDataTable.vue';
import { useShoppingCart } from '../composables/useShoppingCart';
import { PRODUCT_CARD_GRID_CLASS } from '../constants/product-grid';
import { formatMoneyAzn } from '../utils/format-money';
import { isPartialOfflineDetail } from '../utils/offline-product-detail';
import { useNetworkStatusStore } from '../stores/networkStatus';

const route = useRoute();
const cart = useShoppingCart();
const network = useNetworkStatusStore();
const slug = computed(() => String(route.params.slug ?? ''));

const loading = ref(true);
const error = ref<string | null>(null);
const detail = ref<ProductDetailEnvelope | null>(null);
const selectedQty = ref(1);
const addLoading = ref(false);

const info = computed(() => detail.value?.ProductInfo);
const similar = computed(() => detail.value?.SimilarProducts ?? []);
const other = computed(() => detail.value?.OtherProducts ?? []);

const priceAzn = computed(() => formatMoneyAzn(info.value?.price));
const oldPriceAzn = computed(() => formatMoneyAzn(info.value?.old_price));
const unitType = computed(() => {
  const u = (info.value?.unit_type ?? '').trim();
  return u && u !== '-' ? u : null;
});
const outOfStock = computed(() => info.value?.stock_status === false);
const numericPrice = computed(() => {
  const n = Number(info.value?.price);
  return Number.isFinite(n) ? n : 0;
});
const showPrice = computed(() => numericPrice.value !== 0);
const oldPriceVisible = computed(() => {
  const n = Number(info.value?.old_price);
  return Number.isFinite(n) && n > 0;
});

const informationText = computed(() => {
  const raw = info.value?.information;
  return typeof raw === 'string' ? raw.trim() : '';
});

const partNumberRows = computed(() =>
  (info.value?.part_numbers ?? []).map((row) => ({
    id: row.id,
    part_number: row.part_number ?? '',
  })),
);

const vehicleFitmentRows = computed(() =>
  (info.value?.product_details_table ?? []).map((row, idx) => ({
    id: idx,
    make: row.make?.name ?? '',
    model: row.model?.name ?? '',
    generation: row.generation?.name ?? '',
  })),
);

const partNumberColumns = [{ key: 'part_number', label: 'Hissə nömrəsi' }];
const vehicleColumns = [
  { key: 'make', label: 'Marka' },
  { key: 'model', label: 'Model' },
  { key: 'generation', label: 'Nəsil' },
];

const showPartialOfflineNotice = computed(
  () => !network.isOnline && isPartialOfflineDetail(detail.value),
);

async function load() {
  if (!slug.value) return;
  loading.value = true;
  error.value = null;
  try {
    detail.value = await fetchProductDetail(slug.value);
    if (!detail.value?.ProductInfo) error.value = 'Məhsul tapılmadı.';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Yüklənmədi.';
    detail.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(slug, load);

function productAsListItem(): ProductListItem | null {
  const p = info.value;
  if (!p?.id) return null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    cover: p.cover,
    price: p.price,
    old_price: p.old_price,
    unit_type: p.unit_type,
    stock_status: p.stock_status,
  };
}

function addToCart() {
  if (outOfStock.value) return;
  const item = productAsListItem();
  if (!item) return;
  addLoading.value = true;
  try {
    cart.addProduct(item, selectedQty.value);
  } finally {
    setTimeout(() => {
      addLoading.value = false;
    }, 400);
  }
}
</script>

<template>
  <div class="mx-auto max-w-[1400px]">
    <ProductDetailSkeleton v-if="loading" />
    <p v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {{ error }}
    </p>

    <template v-else-if="info">
      <p
        v-if="showPartialOfflineNotice"
        class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        Oflayn rejim — əsas məlumatlar göstərilir. Tam təfərrüatlar (cədvəllər, oxşar məhsullar) üçün
        internetlə tətbiqi açıb keşin dolmasını gözləyin.
      </p>
      <div class="pb-2 pt-2 md:pt-4">
        <div class="grid grid-cols-1 gap-7 lg:grid-cols-10 2xl:gap-8">
          <div class="lg:col-span-6">
            <ProductDetailGallery
              :cover="info.cover"
              :images="info.images"
              :alt="info.name ?? ''"
            />
          </div>

          <div class="flex flex-col lg:col-span-4 lg:pl-2">
            <div class="pb-3 lg:pb-5">
              <h1
                class="-mt-1.5 text-lg font-medium text-zinc-900 md:text-xl xl:text-2xl"
              >
                {{ info.name }}
                <span
                  v-if="unitType"
                  class="ml-2.5 inline-block rounded bg-emerald-600/15 px-2 py-1 text-xs font-bold uppercase text-emerald-800 md:text-sm"
                >
                  {{ unitType }}
                </span>
              </h1>

              
              <div v-if="showPrice" class="mt-4 flex flex-wrap items-center justify-start">
                <span class="text-2xl font-semibold text-zinc-900">{{ priceAzn }}</span>
                <del
                  v-if="oldPriceVisible"
                  class="ml-2 text-2xl font-semibold text-red-600 opacity-70"
                >
                  {{ oldPriceAzn }}
                </del>
              </div>
              <p v-if="outOfStock" class="mt-2 text-sm font-semibold text-red-600">
                Stokda yoxdur
              </p>

              <div
                v-if="info.shop?.title"
                class="mt-4 text-sm text-zinc-600"
              >
                Mağaza: {{ info.shop.title }}
              </div>
            </div>

            <div class="space-y-3 pt-1.5 md:space-y-3.5 lg:pt-3 xl:pt-4">
              <ProductDetailQtyCounter
                v-model="selectedQty"
                :disabled="outOfStock"
              />
              <button
                type="button"
                class="flex w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="outOfStock || addLoading"
                @click="addToCart"
              >
                <svg
                  class="mr-3 h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                {{ addLoading ? '…' : 'Səbətə at' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Məhsul təfərrüatları — web ProductDetailsTab -->
        <section class="w-full py-11 sm:px-0 lg:py-14 xl:py-16">
          <div class="border-b border-zinc-200">
            <span class="relative inline-block pb-3 text-[15px] font-medium text-zinc-900 lg:pb-5 lg:text-[17px]">
              Məhsul təfərrüatları
            </span>
          </div>

          <div class="mt-6 lg:mt-9">
            <div v-if="informationText" class="mb-8 lg:mb-10">
              <h3 class="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-900 md:text-lg">
                <span
                  class="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.35)]"
                  aria-hidden="true"
                />
                Məhsul məlumatı
              </h3>
              <div
                class="relative overflow-hidden rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50/80 px-5 py-5 shadow-[0_1px_3px_rgba(251,191,36,0.15)] ring-1 ring-amber-100/80 md:px-6 md:py-6"
              >
                <div
                  class="pointer-events-none absolute inset-y-3 start-0 w-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-500 md:inset-y-4"
                />
                <div
                  class="relative ps-4 md:ps-5 prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-[1.75] text-stone-800 md:text-[15px]"
                  v-html="informationText"
                />
              </div>
            </div>

            <ProductDetailsDataTable
              v-if="partNumberRows.length"
              :columns="partNumberColumns"
              :rows="partNumberRows"
              row-key="id"
              :min-visible="5"
            />
            <p
              v-else-if="!informationText && !vehicleFitmentRows.length"
              class="text-sm text-zinc-500"
            >
              Əlavə təfərrüat yoxdur.
            </p>

            <ProductDetailsDataTable
              v-if="vehicleFitmentRows.length"
              class="mt-8"
              :columns="vehicleColumns"
              :rows="vehicleFitmentRows"
              row-key="id"
              :min-visible="5"
            />
          </div>
        </section>
      </div>

      <section v-if="similar.length" class="mb-8 lg:mb-10 xl:mb-12">
        <h2 class="-mt-1.5 mb-5 pb-0.5 text-xl font-semibold text-zinc-900 xl:mb-6">
          Oxşar məhsullar
        </h2>
        <div :class="PRODUCT_CARD_GRID_CLASS">
          <ProductCard v-for="p in similar" :key="p.id" :product="p" />
        </div>
      </section>

      <section v-if="other.length" class="mb-8 lg:mb-10 xl:mb-12">
        <h2 class="-mt-1.5 mb-5 pb-0.5 text-xl font-semibold text-zinc-900 xl:mb-6">
          Digər məhsullar
        </h2>
        <div :class="PRODUCT_CARD_GRID_CLASS">
          <ProductCard v-for="p in other" :key="p.id" :product="p" />
        </div>
      </section>
    </template>
  </div>
</template>
