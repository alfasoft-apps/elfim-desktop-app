<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import CartPanel from '../components/CartPanel.vue';
import CheckoutFlowSteps from '../components/CheckoutFlowSteps.vue';
import { createOrder } from '../api/elfim-api';
import { ROUTES } from '../constants/routes';
import { useShoppingCart } from '../composables/useShoppingCart';
import { useSessionAuthStore } from '../stores/sessionAuth';
import { productIdFromLine } from '../utils/generate-cart-item';

const router = useRouter();
const cart = useShoppingCart();
const sessionAuth = useSessionAuthStore();
const { isAuthenticated } = storeToRefs(sessionAuth);

const note = ref('');
const submitLoading = ref(false);
const submitError = ref<string | null>(null);

const cartLineCount = computed(() => {
  const p = cart.payload.value as Record<string, unknown> | null | undefined;
  if (!p) return 0;
  const raw = p.items ?? p.Items;
  return Array.isArray(raw) ? raw.length : 0;
});

const cartItemTotal = computed(() => {
  const p = cart.payload.value;
  if (!p) return 0;
  return Number(p.totalItems ?? (p as { TotalItems?: number }).TotalItems ?? 0);
});

function linesFromPayload(): Record<string, unknown>[] {
  const p = cart.payload.value as Record<string, unknown> | null | undefined;
  if (!p) return [];
  const raw = p.items ?? p.Items;
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
}

async function submitOrder() {
  submitError.value = null;
  const lines = linesFromPayload();
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
  <div class="mx-auto max-w-3xl space-y-6 pb-6">
    <CheckoutFlowSteps
      :step="2"
      heading="Ödəniş"
      description="Səbəti təsdiqləyin və sifarişi göndərin."
      show-return-to-cart
    />

    <section v-if="!isAuthenticated" class="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 shadow-sm">
      <p class="font-medium">Ödəniş üçün daxil olun.</p>
      <RouterLink :to="ROUTES.SIGNIN" class="mt-3 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700">
        Daxil ol
      </RouterLink>
    </section>

    <template v-else>
      <CartPanel
        :loading="cart.loading.value"
        :error="cart.error.value"
        :payload="cart.payload.value"
        :authenticated="true"
        :editable="false"
      />

      <section v-if="cartLineCount > 0" class="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <h3 class="text-base font-semibold text-zinc-900">Sifariş təsviri</h3>
            <p class="mt-1 text-sm text-zinc-500">Çatdırılma ünvanı masaüstü POS-da opsionaldır; qeyd göndərilir.</p>
          </div>
          <p v-if="cartItemTotal > 0" class="text-sm font-semibold text-zinc-900">{{ cartItemTotal }} məhsul</p>
        </div>

        <div>
          <label class="block text-xs font-medium text-zinc-700">Qeyd</label>
          <textarea
            v-model="note"
            rows="4"
            class="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            placeholder="Çatdırılma və ya sifariş qeydi…"
          />
          <p class="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Yekun qiymət və endirimlər ödənişin işlənməsi zamanı müəyyən edilə bilər.
          </p>
        </div>

        <p v-if="submitError" class="text-sm text-red-600">{{ submitError }}</p>

        <button
          type="button"
          class="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-700 disabled:opacity-50"
          :disabled="submitLoading || cart.loading.value"
          @click="submitOrder"
        >
          <span v-if="submitLoading" class="flex items-center gap-2">
            <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Göndərilir…
          </span>
          <span v-else>Sifarişi göndər</span>
        </button>
      </section>

      <p v-else class="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 py-10 text-center text-sm text-zinc-600">
        Səbət boşdur.
        <RouterLink :to="ROUTES.CART" class="font-medium text-emerald-700 hover:underline">Səbətə keç</RouterLink>
      </p>
    </template>
  </div>
</template>
