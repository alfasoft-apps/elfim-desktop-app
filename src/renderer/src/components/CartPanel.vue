<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { CartPayload } from '../api/types';
import { ROUTES } from '../constants/routes';
import CachedImage from './CachedImage.vue';
import CartQtyEditor from './CartQtyEditor.vue';

const props = withDefaults(
  defineProps<{
    loading: boolean;
    error: string | null;
    payload: CartPayload | null;
    /** Giriş olunmayıbsa boş səbətdə link göstərilir */
    authenticated?: boolean;
    /** +/- və sil düymələri */
    editable?: boolean;
    compact?: boolean;
  }>(),
  {
    authenticated: true,
    editable: false,
    compact: false,
  },
);

const emit = defineEmits<{
  adjust: [line: Record<string, unknown>, delta: number];
  /** Mütləq miqdar (input / yazı). */
  setQuantity: [line: Record<string, unknown>, qty: number];
  removeLine: [cartLineId: number];
  clear: [];
}>();

const lines = computed(() => {
  const p = props.payload as Record<string, unknown> | null | undefined;
  if (!p) return [];
  const raw = p.items ?? p.Items;
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
});

const totalText = computed(() => formatMoney(props.payload?.total));

function formatMoney(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function lineQty(line: Record<string, unknown>): number {
  return Number(line.quantity ?? line.Quantity ?? 0);
}

function linePrice(line: Record<string, unknown>): string | null {
  return formatMoney(line.price ?? line.Price);
}

function lineName(line: Record<string, unknown>): string {
  return String(line.name ?? line.Name ?? '');
}

function lineImageRaw(line: Record<string, unknown>): string | undefined {
  const raw = (line.image ?? line.Image) as string | undefined;
  return raw?.trim() || undefined;
}

function lineId(line: Record<string, unknown>): number {
  return Number(line.id ?? line.Id ?? 0);
}
</script>

<template>
  <div class="space-y-4" :class="compact ? '' : 'mx-auto max-w-3xl'">
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <p v-if="loading && lines.length === 0" class="text-center text-sm text-zinc-500">Yüklənir…</p>

    <template v-else-if="lines.length === 0">
      <p
        class="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-500"
        :class="compact ? 'py-6' : 'py-12'"
      >
        Səbət boşdur<span v-if="!authenticated"> və ya giriş tələb olunur</span>.
      </p>
      <div v-if="!authenticated" class="text-center">
        <RouterLink :to="ROUTES.SIGNIN" class="text-sm font-medium text-emerald-700 hover:underline">
          Daxil ol
        </RouterLink>
      </div>
    </template>

    <ul v-else class="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <li v-for="line in lines" :key="String(line.id ?? line.slug)" class="flex gap-3 p-3 sm:gap-4 sm:p-4">
        <RouterLink
          v-if="line.slug"
          :to="ROUTES.PRODUCT(String(line.slug))"
          class="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:h-16 sm:w-16"
        >
          <CachedImage
            v-if="lineImageRaw(line)"
            :src="lineImageRaw(line)"
            class="h-full w-full object-cover"
            alt=""
          />
        </RouterLink>
        <div v-else class="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:h-16 sm:w-16">
          <CachedImage
            v-if="lineImageRaw(line)"
            :src="lineImageRaw(line)"
            class="h-full w-full object-cover"
            alt=""
          />
        </div>
        <div class="min-w-0 flex-1">
          <RouterLink
            v-if="line.slug"
            :to="ROUTES.PRODUCT(String(line.slug))"
            class="font-medium text-zinc-900 hover:text-emerald-800"
          >
            {{ lineName(line) }}
          </RouterLink>
          <p v-else class="font-medium text-zinc-900">{{ lineName(line) }}</p>
          <p class="mt-0.5 text-sm text-zinc-500">
            {{ lineQty(line) }} ədəd × {{ linePrice(line) }} ₼
          </p>
          <div v-if="editable" class="mt-2 flex flex-wrap items-center gap-2">
            <div class="min-w-0 w-max max-w-full">
              <CartQtyEditor
                :quantity="lineQty(line)"
                :disabled="loading"
                :compact="compact"
                @increment="emit('adjust', line, 1)"
                @decrement="emit('adjust', line, -1)"
                @set-quantity="(q) => emit('setQuantity', line, q)"
              />
            </div>
            <button
              type="button"
              class="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
              :disabled="loading"
              @click="emit('removeLine', lineId(line))"
            >
              Sil
            </button>
          </div>
        </div>
      </li>
    </ul>

    <div v-if="lines.length && editable" class="flex justify-between gap-2">
      <button
        type="button"
        class="text-sm font-medium text-red-600 hover:underline disabled:opacity-40"
        :disabled="loading"
        @click="emit('clear')"
      >
        Səbəti təmizlə
      </button>
      <div v-if="totalText" class="text-base font-semibold text-zinc-900">Cəm: {{ totalText }} ₼</div>
    </div>
    <div v-else-if="lines.length && totalText" class="flex justify-end text-lg font-semibold text-zinc-900">
      Cəm: {{ totalText }} ₼
    </div>
  </div>
</template>
