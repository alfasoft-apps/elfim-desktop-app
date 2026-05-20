<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, watch } from 'vue';
import { RouterLink } from 'vue-router';
import CartPanel from '../CartPanel.vue';
import { productIdFromLine } from '../../utils/generate-cart-item';
import { ROUTES } from '../../constants/routes';
import { useShoppingCart } from '../../composables/useShoppingCart';
import { useSessionAuthStore } from '../../stores/sessionAuth';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const cart = useShoppingCart();
const auth = useSessionAuthStore();
const { isAuthenticated } = storeToRefs(auth);

function close() {
  emit('update:open', false);
}

function onBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).dataset.backdrop === '1') close();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
}

watch(
  () => props.open,
  (v) => {
    document.body.style.overflow = v ? 'hidden' : '';
    if (v) cart.hydrateFromStorage();
  },
);

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
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
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex justify-end bg-black/40"
        data-backdrop="1"
        @click="onBackdropClick"
      >
        <Transition name="slide-right">
          <aside
            v-if="open"
            class="relative flex h-full w-[min(100%,24rem)] flex-col bg-white shadow-xl"
            @click.stop
          >
            <div class="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h2 class="text-lg font-semibold text-zinc-900">Alış-veriş səbəti</h2>
              <button
                type="button"
                class="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
                aria-label="Bağla"
                @click="close"
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto px-4 py-4">
              <CartPanel
                :loading="cart.loading.value"
                :error="cart.error.value"
                :payload="cart.payload.value"
                :authenticated="isAuthenticated"
                editable
                compact
                @adjust="onAdjust"
                @set-quantity="onSetQuantity"
                @remove-line="onRemove"
                @clear="onClear"
              />
            </div>

            <div class="border-t border-zinc-200 p-4">
              <RouterLink
                :to="ROUTES.CHECKOUT"
                class="mb-2 block w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
                @click="close"
              >
                Ödənişə keç
              </RouterLink>
              <RouterLink
                :to="ROUTES.CART"
                class="block text-center text-sm text-emerald-700 hover:underline"
                @click="close"
              >
                Tam səbət səhifəsi
              </RouterLink>
            </div>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.25s ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>
