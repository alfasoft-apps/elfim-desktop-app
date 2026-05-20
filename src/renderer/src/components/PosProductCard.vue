<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { ProductListItem } from '../api/types';
import { ROUTES } from '../constants/routes';
import { formatMoneyAzn } from '../utils/format-money';
import CachedImage from './CachedImage.vue';
import CartQtyEditor from './CartQtyEditor.vue';

const props = withDefaults(
  defineProps<{
    product: ProductListItem;
    /** Səbətdəki miqdar — 0 olduqda «SƏBƏTƏ AT», əks halda +/- pill */
    cartQty?: number;
    loading?: boolean;
  }>(),
  { cartQty: 0 },
);

const emit = defineEmits<{
  addToCart: [productId: number];
  increment: [productId: number];
  decrement: [productId: number];
  /** Mütləq miqdar (Enter və ya yazıdan sonra debounce). */
  setQuantity: [productId: number, qty: number];
}>();

/** stock_status yalnız explicit false olduqda stoksuz sayılır */
const inStock = computed(() => props.product.stock_status !== false);
const priceAzn = computed(() => formatMoneyAzn(props.product.price));
const oldPriceAzn = computed(() => formatMoneyAzn(props.product.old_price));
const unitLabel = computed(() => (props.product.unit_type ?? '').trim() || null);

function onAdd(e: Event) {
  e.preventDefault();
  e.stopPropagation();
  emit('addToCart', props.product.id);
}
</script>

<template>
  <div
    class="relative flex h-[296px] w-full min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow-[0_4px_18px_rgba(15,23,42,0.1)]"
  >
    <div class="relative h-[148px] w-full shrink-0 rounded-t-xl bg-zinc-50">
      <div class="absolute inset-0 overflow-hidden rounded-t-xl">
        <RouterLink
          v-if="product.slug"
          :to="ROUTES.PRODUCT(product.slug)"
          class="block h-full w-full"
          tabindex="-1"
        >
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
        <div v-else class="h-full w-full bg-zinc-100" />
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
            class="touch-manipulation flex h-10 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-full bg-teal-600 px-3 text-xs font-bold uppercase tracking-wide text-white shadow-lg ring-2 ring-white transition hover:bg-teal-700 disabled:opacity-50"
            :disabled="loading"
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
          :disabled="loading"
          :increment-disabled="!inStock"
          @increment="emit('increment', product.id)"
          @decrement="emit('decrement', product.id)"
          @set-quantity="(q) => emit('setQuantity', product.id, q)"
        />
      </div>
    </div>

    <div class="flex min-h-0 flex-1 flex-col px-3.5 pb-3.5 pt-3">
      <p v-if="priceAzn" class="text-lg font-bold leading-tight tracking-tight text-zinc-900">
        {{ priceAzn }}
      </p>
      <p v-if="oldPriceAzn" class="mt-0.5 text-xs text-zinc-400 line-through">{{ oldPriceAzn }}</p>

      <RouterLink
        v-if="product.slug"
        :to="ROUTES.PRODUCT(product.slug)"
        class="mt-2 block min-h-0 flex-1 text-left text-base font-medium leading-snug text-teal-600 line-clamp-3 hover:text-teal-700 hover:underline"
      >
        {{ product.name }}
      </RouterLink>
      <p v-else class="mt-2 block min-h-0 flex-1 text-left text-base font-medium leading-snug text-teal-600 line-clamp-3">
        {{ product.name }}
      </p>

      <p v-if="unitLabel" class="mt-auto shrink-0 pt-2 text-sm leading-none text-zinc-400">
        {{ unitLabel }}
      </p>
    </div>
  </div>
</template>
