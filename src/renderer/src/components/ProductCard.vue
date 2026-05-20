<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { ProductListItem } from '../api/types';
import { useShoppingCart } from '../composables/useShoppingCart';
import { ROUTES } from '../constants/routes';
import { formatMoneyAzn } from '../utils/format-money';
import CachedImage from './CachedImage.vue';
import CartQtyEditor from './CartQtyEditor.vue';

const props = defineProps<{ product: ProductListItem }>();

const cart = useShoppingCart();

const priceAzn = computed(() => formatMoneyAzn(props.product.price));
const oldPriceAzn = computed(() => formatMoneyAzn(props.product.old_price));
const unitLabel = computed(() => (props.product.unit_type ?? '').trim() || null);
const inStock = computed(() => props.product.stock_status !== false);

const cartQty = computed(() => {
  const id = Number(props.product.id);
  const line = cart.payload.value?.items?.find((l) => Number(l.id) === id);
  return line ? Number(line.quantity ?? 0) : 0;
});

function onAdd(e: Event) {
  e.preventDefault();
  e.stopPropagation();
  cart.addProduct(props.product, 1);
}

function onIncrement() {
  const line = cart.payload.value?.items?.find((l) => Number(l.id) === Number(props.product.id));
  if (line) cart.deltaLineQuantity(line as unknown as Record<string, unknown>, 1);
  else cart.addProduct(props.product, 1);
}

function onDecrement() {
  const line = cart.payload.value?.items?.find((l) => Number(l.id) === Number(props.product.id));
  if (line) cart.deltaLineQuantity(line as unknown as Record<string, unknown>, -1);
}

function onSetQuantity(qty: number) {
  cart.setProductQuantity(Number(props.product.id), qty);
}
</script>

<template>
  <div
    v-if="product.slug"
    class="relative flex h-[296px] w-full min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-zinc-100 transition hover:ring-teal-200/60"
  >
    <div class="relative h-[148px] w-full shrink-0 rounded-t-xl bg-zinc-50">
      <div class="absolute inset-0 overflow-hidden rounded-t-xl">
        <RouterLink :to="ROUTES.PRODUCT(product.slug)" class="block h-full w-full" tabindex="-1">
          <CachedImage
            v-if="product.cover"
            :src="product.cover"
            :alt="product.name ?? ''"
            class="h-full w-full object-cover"
            loading="lazy"
          />
          <div v-else class="flex h-full w-full items-center justify-center text-sm text-zinc-400">
            Şəkil yoxdur
          </div>
        </RouterLink>
      </div>
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 h-14 rounded-t-xl bg-gradient-to-t from-black/55 via-black/20 to-transparent"
        aria-hidden="true"
      />
      <div
        class="absolute bottom-2 left-1/2 z-10 flex w-[min(calc(100%-0.75rem),14rem)] min-h-10 -translate-x-1/2 justify-center"
      >
        <template v-if="Number(cartQty) <= 0">
          <button
            v-if="inStock"
            type="button"
            class="touch-manipulation flex h-10 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-full bg-teal-600 px-3 text-xs font-bold uppercase tracking-wide text-white shadow-lg ring-2 ring-white transition hover:bg-teal-700"
            @click="onAdd"
          >
            SƏBƏTƏ AT
          </button>
          <div
            v-else
            class="flex h-10 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-full bg-zinc-200 px-3 text-center text-xs font-semibold text-zinc-600"
          >
            Stokda yoxdur
          </div>
        </template>
        <CartQtyEditor
          v-else
          :quantity="Number(cartQty)"
          :increment-disabled="!inStock"
          @increment="onIncrement"
          @decrement="onDecrement"
          @set-quantity="onSetQuantity"
        />
      </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col px-3.5 pb-3.5 pt-3">
      <p v-if="priceAzn" class="text-lg font-bold leading-tight tracking-tight text-zinc-900">
        {{ priceAzn }}
      </p>
      <p v-if="oldPriceAzn" class="mt-0.5 text-xs text-zinc-400 line-through">{{ oldPriceAzn }}</p>
      <RouterLink
        :to="ROUTES.PRODUCT(product.slug)"
        class="mt-2 block min-h-0 flex-1 text-left text-base font-medium leading-snug text-teal-600 line-clamp-3 hover:text-teal-700 hover:underline"
      >
        {{ product.name }}
      </RouterLink>
      <p v-if="unitLabel" class="mt-auto shrink-0 pt-2 text-sm leading-none text-zinc-400">
        {{ unitLabel }}
      </p>
    </div>
  </div>
  <div
    v-else
    class="flex h-[296px] flex-col justify-center overflow-hidden rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-base text-zinc-500 ring-1 ring-zinc-100"
  >
    {{ product.name }}
  </div>
</template>
