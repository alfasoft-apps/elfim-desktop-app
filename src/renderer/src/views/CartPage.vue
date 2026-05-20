<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import CartPanel from '../components/CartPanel.vue';
import CheckoutFlowSteps from '../components/CheckoutFlowSteps.vue';
import { productIdFromLine } from '../utils/generate-cart-item';
import { useShoppingCart } from '../composables/useShoppingCart';
import { useSessionAuthStore } from '../stores/sessionAuth';
import { ROUTES } from '../constants/routes';

const cart = useShoppingCart();
const auth = useSessionAuthStore();
const { isAuthenticated } = storeToRefs(auth);

onMounted(() => {
  cart.hydrateFromStorage();
});

const cartLineCount = computed(() => {
  const p = cart.payload.value as Record<string, unknown> | null | undefined;
  if (!p) return 0;
  const raw = p.items ?? p.Items;
  return Array.isArray(raw) ? raw.length : 0;
});

const hasCheckoutLines = computed(() => {
  const p = cart.payload.value as Record<string, unknown> | null | undefined;
  if (!p) return false;
  const raw = p.items ?? p.Items;
  if (!Array.isArray(raw)) return false;
  for (const line of raw as Record<string, unknown>[]) {
    const pid = productIdFromLine(line);
    const qty = Number(line.quantity ?? line.Quantity ?? 0);
    if (pid && qty > 0) return true;
  }
  return false;
});

function onAdjust(line: Record<string, unknown>, delta: number) {
  cart.deltaLineQuantity(line, delta);
}

function onSetQuantity(line: Record<string, unknown>, qty: number) {
  const pid = productIdFromLine(line);
  if (!pid) return;
  cart.setProductQuantity(pid, qty);
}

function onRemove(id: number) {
  cart.removeLine(id);
}

function onClear() {
  cart.clearAll();
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <CheckoutFlowSteps
      :step="1"
      heading="Səbət"
      description="Məhsulları idarə edin və ödənişə keçin."
    />

    <CartPanel
      :loading="cart.loading.value"
      :error="cart.error.value"
      :payload="cart.payload.value"
      :authenticated="isAuthenticated"
      editable
      @adjust="onAdjust"
      @set-quantity="onSetQuantity"
      @remove-line="onRemove"
      @clear="onClear"
    />

    <section
      v-if="cartLineCount > 0 && isAuthenticated && hasCheckoutLines"
      class="no-print space-y-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-sm ring-1 ring-emerald-500/10"
    >
      <RouterLink
        :to="ROUTES.CHECKOUT"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-700"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 8l4 4m0 0l-4 4m4-4H3"
          />
        </svg>
        Ödənişə keç
      </RouterLink>
      <RouterLink
        :to="ROUTES.CHECKOUT"
        class="flex w-full items-center justify-center rounded-xl border border-emerald-200 bg-white py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
      >
        Ətraflı ödəniş səhifəsi
      </RouterLink>
    </section>

    <p
      v-else-if="cartLineCount > 0 && !isAuthenticated"
      class="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center text-sm text-zinc-600"
    >
      Ödəniş üçün
      <RouterLink :to="ROUTES.SIGNIN" class="font-semibold text-emerald-700 hover:underline">daxil olun</RouterLink>.
    </p>
  </div>
</template>
