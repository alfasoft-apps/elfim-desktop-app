<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import CartPanel from '../components/CartPanel.vue';
import PosProductCard from '../components/PosProductCard.vue';
import ProductCardSkeleton from '../components/ProductCardSkeleton.vue';
import { createOrder, fetchCategories, fetchShops, searchOem } from '../api/elfim-api';
import { productIdFromLine } from '../utils/generate-cart-item';
import type { CategoryItem, ProductListItem, ShopListItem } from '../api/types';
import { PRODUCT_CARD_GRID_CLASS } from '../constants/product-grid';
import { ROUTES } from '../constants/routes';
import { useShoppingCart } from '../composables/useShoppingCart';
import { useAppDataCacheStore } from '../stores/appDataCache';
import { usePosCatalogFiltersStore } from '../stores/posCatalogFilters';
import { scrollAppMainToTopAfterPaint } from '../utils/scroll-app-main';

const router = useRouter();
const cart = useShoppingCart();

const filters = usePosCatalogFiltersStore();
const { oemQuery, selectedCategoryId, selectedShopId, searchPage } = storeToRefs(filters);

const searchLoading = ref(false);
const searchError = ref<string | null>(null);
const results = ref<ProductListItem[]>([]);
const searchLastPage = ref(1);
const PAGE_SIZE = 15;

const categories = ref<CategoryItem[]>([]);
const shops = ref<ShopListItem[]>([]);
const filtersLoading = ref(false);

const note = ref('');
const submitLoading = ref(false);
const submitError = ref<string | null>(null);
const lineBusy = ref(false);

const cartLineCount = computed(() => {
  const p = cart.payload.value as Record<string, unknown> | null | undefined;
  if (!p) return 0;
  const raw = p.items ?? p.Items;
  return Array.isArray(raw) ? raw.length : 0;
});

const cartItemCount = computed(() => {
  const p = cart.payload.value;
  if (!p) return 0;
  return Number(p.totalItems ?? (p as { TotalItems?: number }).TotalItems ?? 0);
});

const basketOpen = ref(false);

watch(cartItemCount, (n, prev) => {
  if (n > 0 && prev === 0) basketOpen.value = true;
});

function pillClass(active: boolean): string {
  return active
    ? 'border-teal-500 bg-teal-50 text-teal-900 shadow-sm ring-1 ring-teal-400/40'
    : 'border-zinc-200/90 bg-white text-zinc-600 shadow-sm hover:border-teal-300/80 hover:bg-teal-50/60';
}

async function runSearch(page = 1) {
  const previousPage = searchPage.value;
  searchLoading.value = true;
  searchError.value = null;
  try {
    const pageResult = await searchOem(oemQuery.value.trim() || '%%', page, PAGE_SIZE, {
      categoryId: selectedCategoryId.value,
      shopId: selectedShopId.value,
    });
    results.value = pageResult.data;
    const resolvedPage = pageResult.meta?.current_page ?? page;
    searchPage.value = resolvedPage;
    searchLastPage.value = pageResult.meta?.last_page ?? 1;
    /** Scroll sorğu parametri dəyişəndə — API meta.current_page bəzən köhnə qalırsa əvvəlki məntiqlə sıçramır. */
    if (previousPage !== page) {
      await nextTick();
      scrollAppMainToTopAfterPaint('instant');
    }
  } catch (e) {
    searchError.value = e instanceof Error ? e.message : 'Axtarış alınmadı.';
    results.value = [];
  } finally {
    searchLoading.value = false;
  }
}

let oemDebounce: ReturnType<typeof setTimeout> | null = null;
watch(oemQuery, () => {
  if (oemDebounce) clearTimeout(oemDebounce);
  oemDebounce = setTimeout(() => {
    oemDebounce = null;
    void runSearch(1);
  }, 400);
});

onBeforeUnmount(() => {
  if (oemDebounce) clearTimeout(oemDebounce);
});

onMounted(async () => {
  await useAppDataCacheStore().waitUntilDiskReady();
  cart.hydrateFromStorage();
  filtersLoading.value = true;
  try {
    const [cats, shs] = await Promise.all([fetchCategories(), fetchShops()]);
    categories.value = cats;
    shops.value = shs;
  } catch {
    categories.value = [];
    shops.value = [];
  } finally {
    filtersLoading.value = false;
  }
  await runSearch(searchPage.value);
});

function selectCategory(id: number | null) {
  selectedCategoryId.value = id;
  void runSearch(1);
}

function selectShop(id: number | null) {
  selectedShopId.value = id;
  void runSearch(1);
}

const cartQtyByProductId = computed(() => {
  const out: Record<number, number> = {};
  for (const line of cart.payload.value?.items ?? []) {
    const id = Number(line.id);
    if (Number.isFinite(id)) out[id] = Number(line.quantity ?? 0);
  }
  return out;
});

function cartLineForProduct(productId: number): Record<string, unknown> | null {
  const id = Number(productId);
  const p = cart.payload.value as Record<string, unknown> | null | undefined;
  if (!p) return null;
  const raw = p.items ?? p.Items;
  if (!Array.isArray(raw)) return null;
  for (const line of raw as Record<string, unknown>[]) {
    if (Number(productIdFromLine(line)) === id) return line;
  }
  return null;
}

function productById(productId: number): ProductListItem | undefined {
  const id = Number(productId);
  return results.value.find((p) => Number(p.id) === id);
}

function onAddProduct(productId: number) {
  const product = productById(productId);
  if (!product) {
    submitError.value = 'Məhsul tapılmadı.';
    return;
  }
  lineBusy.value = true;
  submitError.value = null;
  try {
    cart.addProduct(product, 1);
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Səbətə əlavə olunmadı.';
  } finally {
    lineBusy.value = false;
  }
}

function onCardIncrement(productId: number) {
  lineBusy.value = true;
  submitError.value = null;
  try {
    const line = cartLineForProduct(productId);
    if (line) cart.deltaLineQuantity(line, 1);
    else {
      const product = productById(productId);
      if (product) cart.addProduct(product, 1);
    }
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Xəta';
  } finally {
    lineBusy.value = false;
  }
}

function onCardDecrement(productId: number) {
  lineBusy.value = true;
  submitError.value = null;
  try {
    const line = cartLineForProduct(productId);
    if (line) cart.deltaLineQuantity(line, -1);
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Xəta';
  } finally {
    lineBusy.value = false;
  }
}

function onCardSetQuantity(productId: number, qty: number) {
  lineBusy.value = true;
  submitError.value = null;
  try {
    cart.setProductQuantity(productId, qty);
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Miqdar yenilənmədi.';
  } finally {
    lineBusy.value = false;
  }
}

function onAdjust(line: Record<string, unknown>, delta: number) {
  lineBusy.value = true;
  submitError.value = null;
  try {
    cart.deltaLineQuantity(line, delta);
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Miqdar yenilənmədi.';
  } finally {
    lineBusy.value = false;
  }
}

function onSetLineQuantity(line: Record<string, unknown>, qty: number) {
  lineBusy.value = true;
  submitError.value = null;
  try {
    const pid = productIdFromLine(line);
    if (!pid) return;
    cart.setProductQuantity(pid, qty);
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Miqdar yenilənmədi.';
  } finally {
    lineBusy.value = false;
  }
}

function onRemoveLine(id: number) {
  lineBusy.value = true;
  try {
    cart.removeLine(id);
  } finally {
    lineBusy.value = false;
  }
}

function onClearCart() {
  lineBusy.value = true;
  submitError.value = null;
  try {
    cart.clearAll();
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Təmizlənmədi.';
  } finally {
    lineBusy.value = false;
  }
}

async function submitOrder() {
  submitError.value = null;
  const p = cart.payload.value as Record<string, unknown> | null | undefined;
  const raw = p?.items ?? p?.Items;
  const lines = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  const products: { product_id: number; quantity: number }[] = [];
  for (const line of lines) {
    const pid = productIdFromLine(line);
    const qty = Number(line.quantity ?? line.Quantity ?? 0);
    if (pid && qty > 0) products.push({ product_id: pid, quantity: qty });
  }
  if (!products.length) {
    submitError.value = 'Səbətdə məhsul yoxdur.';
    return;
  }

  submitLoading.value = true;
  try {
    const res = await createOrder({
      address_id: null,
      note: note.value.trim() || null,
      leave_at_door: false,
      products,
    });
    if (res.success && res.order_id != null) {
      note.value = '';
      cart.clearAll();
      await router.push({
        path: ROUTES.ORDER_COMPLETE,
        query: { order_id: String(res.order_id) },
      });
    } else {
      submitError.value = res.message ?? 'Sifariş göndərilmədi.';
    }
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Sifariş göndərilmədi.';
  } finally {
    submitLoading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 pb-28 pt-1">
    <!-- Axtarış və süzgəclər -->
    <section
      class="overflow-hidden rounded-2xl border border-teal-100/80 bg-gradient-to-br from-teal-50/90 via-white to-zinc-50/80 shadow-md shadow-teal-900/5 ring-1 ring-teal-500/10"
    >
      <div class="border-b border-teal-100/60 bg-white/40 px-4 py-4 sm:px-6 sm:py-5">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-teal-700/90">POS</p>
            <h2 class="text-xl font-semibold tracking-tight text-zinc-900">Məhsul axtarışı</h2>
            <p class="mt-1 max-w-xl text-sm leading-relaxed text-zinc-600">
              OEM kodu daxil edin və ya boş saxlayın — ilkin siyahı üçün
              <code class="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[11px] text-teal-800 ring-1 ring-teal-200/80"
                >%%</code
              >
              istifadə olunur. Kateqoriya və mağaza ilə daraldın.
            </p>
          </div>
        </div>

        <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <div class="relative min-h-[44px] flex-1">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              v-model="oemQuery"
              type="search"
              class="h-11 w-full rounded-xl border border-zinc-200/90 bg-white py-2 pl-10 pr-3 text-sm shadow-inner outline-none ring-teal-500/20 transition placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
              placeholder="OEM kodu (boş — bütün məhsulların ilk səhifəsi)"
              @keyup.enter="runSearch(1)"
            />
          </div>
          <button
            type="button"
            class="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 px-6 text-sm font-semibold text-white shadow-md shadow-teal-900/20 transition hover:bg-teal-700 disabled:opacity-50"
            :disabled="searchLoading"
            @click="runSearch(1)"
          >
            <span v-if="searchLoading" class="flex items-center gap-2">
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Axtarılır
            </span>
            <span v-else>Axtar</span>
          </button>
        </div>
        <p v-if="searchError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {{ searchError }}
        </p>
      </div>

      <div class="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        <template v-if="filtersLoading">
          <div aria-busy="true">
            <p class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <span class="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-200 to-transparent sm:hidden" />
              Kateqoriya
            </p>
            <div class="-mx-1 flex max-h-[7.5rem] flex-wrap gap-2 overflow-y-auto px-1 pb-1 [scrollbar-width:thin]">
              <div v-for="n in 14" :key="'cat-sk-' + n" class="h-8 w-[4.5rem] animate-pulse rounded-full bg-zinc-200/80" />
            </div>
          </div>
          <div aria-busy="true">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Mağaza</p>
            <div class="-mx-1 flex max-h-[7.5rem] flex-wrap gap-2 overflow-y-auto px-1 pb-1 [scrollbar-width:thin]">
              <div v-for="n in 12" :key="'shop-sk-' + n" class="h-8 max-w-[140px] flex-1 animate-pulse rounded-full bg-zinc-200/80" />
            </div>
          </div>
        </template>
        <template v-else>
          <div>
            <p class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <span class="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-200 to-transparent sm:hidden" />
              Kateqoriya
            </p>
            <div
              class="-mx-1 flex max-h-[7.5rem] flex-wrap gap-2 overflow-y-auto px-1 pb-1 [scrollbar-width:thin]"
            >
              <button
                type="button"
                :class="['rounded-full border px-3 py-1.5 text-xs font-medium transition', pillClass(selectedCategoryId === null)]"
                @click="selectCategory(null)"
              >
                Hamısı
              </button>
              <button
                v-for="c in categories"
                :key="'cat-' + c.id"
                type="button"
                :class="['rounded-full border px-3 py-1.5 text-xs font-medium transition', pillClass(selectedCategoryId === c.id)]"
                @click="selectCategory(c.id)"
              >
                {{ c.name }}
              </button>
            </div>
          </div>
          <div>
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Mağaza</p>
            <div class="-mx-1 flex max-h-[7.5rem] flex-wrap gap-2 overflow-y-auto px-1 pb-1 [scrollbar-width:thin]">
              <button
                type="button"
                :class="['rounded-full border px-3 py-1.5 text-xs font-medium transition', pillClass(selectedShopId === null)]"
                @click="selectShop(null)"
              >
                Hamısı
              </button>
              <button
                v-for="s in shops"
                :key="'shop-' + s.id"
                type="button"
                :class="[
                  'max-w-[220px] truncate rounded-full border px-3 py-1.5 text-xs font-medium transition',
                  pillClass(selectedShopId === s.id),
                ]"
                :title="s.title ?? ''"
                @click="selectShop(s.id)"
              >
                {{ s.title }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </section>

    <!-- Yığılan səbət -->
    <section class="rounded-2xl border border-zinc-200/90 bg-white shadow-md shadow-zinc-900/5 ring-1 ring-zinc-900/5">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left transition hover:bg-zinc-50/80 sm:px-5"
        :aria-expanded="basketOpen"
        @click="basketOpen = !basketOpen"
      >
        <span class="flex min-w-0 items-center gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-900/25"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </span>
          <span class="min-w-0">
            <span class="block font-semibold text-zinc-900">Alış-veriş səbəti</span>
            <span class="text-xs text-zinc-500">Qeyd yazın və sifarişi göndərin</span>
          </span>
        </span>
        <span class="flex shrink-0 items-center gap-2">
          <span
            v-if="cartItemCount > 0"
            class="rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-bold tabular-nums text-white"
          >
            {{ cartItemCount }}
          </span>
          <svg
            class="h-5 w-5 text-zinc-400 transition duration-200"
            :class="basketOpen ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <Transition name="basket-panel">
        <div v-show="basketOpen" class="border-t border-zinc-100 px-4 pb-5 pt-2 sm:px-5">
          <CartPanel
            :loading="cart.loading.value"
            :error="cart.error.value"
            :payload="cart.payload.value"
            :authenticated="true"
            editable
            compact
            @adjust="onAdjust"
            @set-quantity="onSetLineQuantity"
            @remove-line="onRemoveLine"
            @clear="onClearCart"
          />

          <div class="mt-5 space-y-3 rounded-xl bg-zinc-50/80 p-4 ring-1 ring-zinc-200/80">
            <label class="block text-xs font-medium text-zinc-700">Qeyd</label>
            <textarea
              v-model="note"
              rows="3"
              class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25"
              placeholder="Çatdırılma və ya sifariş qeydi…"
            />
            <p class="text-[11px] leading-relaxed text-zinc-500">
              Yekun qiymət və endirimlər ödənişin işlənməsi zamanı müəyyən edilə bilər.
            </p>
            <p v-if="submitError" class="text-sm text-red-600">{{ submitError }}</p>
            <button
              type="button"
              class="w-full rounded-xl bg-teal-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-700 disabled:opacity-50"
              :disabled="submitLoading || cart.loading.value || !cartLineCount"
              @click="submitOrder"
            >
              {{ submitLoading ? '…' : 'Sifarişi göndər' }}
            </button>
            <RouterLink
              :to="ROUTES.CHECKOUT"
              class="block text-center text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline"
            >
              Ətraflı ödəniş səhifəsi
            </RouterLink>
          </div>
        </div>
      </Transition>
    </section>

    <!-- Məhsul şəbəkəsi -->
    <section>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-base font-semibold text-zinc-900">Məhsullar</h3>
        <p v-if="results.length && !searchLoading" class="text-xs text-zinc-500">
          Səhifə {{ searchPage }} / {{ searchLastPage }}
        </p>
        <span
          v-else-if="searchLoading"
          class="inline-block h-3 w-28 animate-pulse rounded-md bg-zinc-200"
          aria-hidden="true"
        />
      </div>

      <div v-if="searchLoading" :class="PRODUCT_CARD_GRID_CLASS" aria-busy="true">
        <ProductCardSkeleton v-for="n in PAGE_SIZE" :key="'pos-sk-' + n" variant="pos" />
      </div>

      <div v-else-if="results.length" :class="PRODUCT_CARD_GRID_CLASS">
        <PosProductCard
          v-for="p in results"
          :key="p.id"
          :product="p"
          :cart-qty="cartQtyByProductId[p.id] ?? 0"
          :loading="lineBusy"
          @add-to-cart="onAddProduct"
          @increment="onCardIncrement"
          @decrement="onCardDecrement"
          @set-quantity="onCardSetQuantity"
        />
      </div>

      <div
        v-else
        class="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 py-14 text-center"
      >
        <p class="text-sm font-medium text-zinc-600">Nəticə tapılmadı</p>
        <p class="mt-1 text-xs text-zinc-500">Kodu və ya süzgəci dəyişib yenidən axtarın.</p>
      </div>

      <div
        v-if="results.length && searchLastPage > 1"
        class="mt-8 flex flex-wrap items-center justify-center gap-2"
      >
        <button
          type="button"
          class="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/50 disabled:opacity-40"
          :disabled="searchLoading || searchPage <= 1"
          @click="runSearch(searchPage - 1)"
        >
          ← Əvvəl
        </button>
        <span class="rounded-lg bg-zinc-100 px-3 py-2 text-sm tabular-nums text-zinc-700">
          {{ searchPage }} / {{ searchLastPage }}
        </span>
        <button
          type="button"
          class="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/50 disabled:opacity-40"
          :disabled="searchLoading || searchPage >= searchLastPage"
          @click="runSearch(searchPage + 1)"
        >
          Sonra →
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.basket-panel-enter-active,
.basket-panel-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s ease;
}
.basket-panel-enter-from,
.basket-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
