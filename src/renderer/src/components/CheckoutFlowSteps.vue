<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ROUTES } from '../constants/routes';

const props = defineProps<{
  /** Cari addım: 1 — Səbət, 2 — Təsdiq (ödəniş), 3 — Tamamlandı */
  step: 1 | 2 | 3;
  heading: string;
  description: string;
  /** Ödəniş səhifəsində «Səbətə qayıt» keçidi */
  showReturnToCart?: boolean;
}>();

function cardClass(n: 1 | 2 | 3): string {
  const active = props.step === n;
  const past = props.step > n;
  if (active) {
    return 'rounded-xl bg-emerald-600 px-2 py-3 text-white shadow-md shadow-emerald-900/15 ring-2 ring-emerald-400/40';
  }
  if (past) {
    return 'rounded-xl bg-white px-2 py-3 text-emerald-600 shadow-sm ring-1 ring-emerald-200';
  }
  return 'rounded-xl bg-white px-2 py-3 text-zinc-400 shadow-sm ring-1 ring-zinc-200';
}

function numClass(n: 1 | 2 | 3): string {
  const active = props.step === n;
  const past = props.step > n;
  if (active) return 'mb-1 block text-lg font-bold';
  if (past) return 'mb-1 block text-lg font-bold text-emerald-700';
  return 'mb-1 block text-lg font-bold text-zinc-300';
}
</script>

<template>
  <div
    class="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-zinc-50 p-4 shadow-sm ring-1 ring-emerald-500/10 sm:p-5"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">{{ heading }}</p>
        <p class="mt-0.5 text-sm text-zinc-600">{{ description }}</p>
      </div>
      <RouterLink
        v-if="showReturnToCart"
        :to="ROUTES.CART"
        class="no-print shrink-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50"
      >
        ← Səbətə qayıt
      </RouterLink>
    </div>
    <ol class="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold sm:text-xs">
      <li :class="cardClass(1)">
        <span :class="numClass(1)">1</span>
        Səbət
      </li>
      <li :class="cardClass(2)">
        <span :class="numClass(2)">2</span>
        Təsdiq
      </li>
      <li :class="cardClass(3)">
        <span :class="numClass(3)">3</span>
        Tamamlandı
      </li>
    </ol>
  </div>
</template>
