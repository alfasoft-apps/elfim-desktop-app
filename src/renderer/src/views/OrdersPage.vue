<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { fetchOrders } from '../api/elfim-api';
import type { OrderSummary } from '../api/types';
import { ROUTES } from '../constants/routes';
import OrdersTableSkeleton from '../components/OrdersTableSkeleton.vue';

const orders = ref<OrderSummary[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    orders.value = await fetchOrders();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Sifarişlər yüklənmədi.';
  } finally {
    loading.value = false;
  }
});

function amount(o: OrderSummary): string {
  const v = o.amount;
  if (v === undefined || v === null) return '—';
  const n = typeof v === 'number' ? v : Number(v);
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function statusName(o: OrderSummary): string {
  return o.status?.name ?? '—';
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <section class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-zinc-900">Sifarişlərim</h2>
      <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    </section>

    <OrdersTableSkeleton v-if="loading" />

    <div v-else-if="orders.length === 0" class="rounded-xl border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-500">
      Sifariş yoxdur və ya giriş lazımdır.
    </div>

    <div v-else class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
          <tr>
            <th class="px-4 py-3">ID</th>
            <th class="px-4 py-3">İzləmə</th>
            <th class="px-4 py-3">Məbləğ</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Tarix</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-100">
          <tr v-for="o in orders" :key="o.id">
            <td class="px-4 py-3 font-mono text-zinc-900">#{{ o.id }}</td>
            <td class="px-4 py-3 text-zinc-600">{{ o.tracking_number ?? '—' }}</td>
            <td class="px-4 py-3">{{ amount(o) }} ₼</td>
            <td class="px-4 py-3">{{ statusName(o) }}</td>
            <td class="px-4 py-3 text-zinc-500">{{ o.created_at ?? '—' }}</td>
            <td class="px-4 py-3 text-right">
              <RouterLink
                :to="ROUTES.ORDER(String(o.id))"
                class="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                <svg class="h-4 w-4 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Ətraflı
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
