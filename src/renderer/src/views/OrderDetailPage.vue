<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { fetchOrderDetail } from '../api/elfim-api';
import type { OrderDetail } from '../api/types';
import OrderDetailSkeleton from '../components/OrderDetailSkeleton.vue';

const route = useRoute();
const orderId = computed(() => Number.parseInt(String(route.params.orderId ?? ''), 10));

const loading = ref(true);
const error = ref<string | null>(null);
const order = ref<OrderDetail | null>(null);

const linesSection = ref<HTMLElement | null>(null);

async function load() {
  if (!Number.isFinite(orderId.value) || orderId.value <= 0) {
    error.value = 'Yanlış sifariş nömrəsi.';
    loading.value = false;
    order.value = null;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    order.value = await fetchOrderDetail(orderId.value);
    if (!order.value) error.value = 'Sifariş tapılmadı.';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Yüklənmədi.';
    order.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(orderId, load);

function money(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (Number.isNaN(n)) return String(v ?? '');
  return new Intl.NumberFormat('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function lineTotal(price: unknown, qty: number): string {
  const p = typeof price === 'number' ? price : Number(price);
  if (Number.isNaN(p)) return '—';
  return money(p * qty);
}

function scrollToLines() {
  linesSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Çap üçün mətnləri təhlükəsiz çıxış (API məhsul adları üçün). */
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Çap / önizləmə üçün tam HTML sənəd (iframe `srcdoc`). */
function buildOrderPrintDocumentHtml(o: OrderDetail): string {
  const products = o.products ?? [];
  const rowsHtml = products
    .map((ln) => {
      const name = escHtml(String(ln.name ?? ''));
      const qty = escHtml(String(ln.quantity ?? ''));
      const price = escHtml(`${money(ln.price)} ₼`);
      const total = escHtml(`${lineTotal(ln.price, ln.quantity ?? 0)} ₼`);
      return `<tr><td>${name}</td><td>${qty}</td><td>${price}</td><td>${total}</td></tr>`;
    })
    .join('');

  const summaryHtml = `
  <section class="card">
    <p class="label">Sifariş</p>
    <h1 class="title">№ ${escHtml(String(o.id))}</h1>
    <p class="meta">Status: ${escHtml(String(o.status?.name ?? '—'))}</p>
    <p class="meta">Ümumi: ${escHtml(`${money(o.total)} ₼`)}</p>
    ${o.created_at ? `<p class="meta muted">${escHtml(String(o.created_at))}</p>` : ''}
    ${o.note ? `<p class="meta">Qeyd: ${escHtml(String(o.note))}</p>` : ''}
  </section>`;

  const tableHtml =
    products.length > 0
      ? `
  <section class="card sheet-products">
    <h2 class="products-heading">Məhsullar</h2>
    <table>
      <thead>
        <tr><th>Məhsul</th><th>Say</th><th>Qiymət</th><th>Cəm</th></tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </section>`
      : '';

  return `<!DOCTYPE html>
<html lang="az">
<head>
  <meta charset="utf-8" />
  <title>${escHtml(`Sifariş № ${o.id}`)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #18181b; }
    body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; padding: 28px 32px; font-size: 14px; line-height: 1.45; }
    .card { background: #fff; border: 1px solid #e4e4e7; border-radius: 14px; padding: 22px 24px; margin-bottom: 22px; }
    .label { margin: 0 0 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #047857; }
    .title { margin: 0 0 14px; font-size: 22px; font-weight: 700; }
    .meta { margin: 6px 0; color: #3f3f46; }
    .muted { font-size: 12px; color: #71717a; }
    .sheet-products { padding: 0; overflow: hidden; }
    .products-heading { margin: 0; padding: 14px 18px; font-size: 15px; font-weight: 600; border-bottom: 1px solid #e4e4e7; background: #fafafa; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead th { text-align: left; padding: 11px 18px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #71717a; background: #fafafa; border-bottom: 1px solid #e4e4e7; }
    tbody td { padding: 11px 18px; border-bottom: 1px solid #f4f4f5; vertical-align: top; }
    tbody tr:last-child td { border-bottom: none; }
    @media print {
      body { padding: 16px 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .card { border: none; border-radius: 0; padding: 0 0 20px; margin-bottom: 18px; box-shadow: none; }
      .sheet-products .products-heading { background: transparent; border-bottom: 1px solid #d4d4d8; }
      thead th { background: transparent !important; }
    }
  </style>
</head>
<body>
  ${summaryHtml}
  ${tableHtml}
</body>
</html>`;
}

const printPreviewOpen = ref(false);
const printPreviewSrcdoc = ref('');
const printIframeRef = ref<HTMLIFrameElement | null>(null);

/** Electron Windows-da sistem çap dialoqunun önizləmə bölməsi çox vaxt boş qalır — əvvəl tətbiqdə önizləmə. */
function openPrintPreview() {
  const o = order.value;
  if (!o) return;
  printPreviewSrcdoc.value = buildOrderPrintDocumentHtml(o);
  printPreviewOpen.value = true;
}

function closePrintPreview() {
  printPreviewOpen.value = false;
  printPreviewSrcdoc.value = '';
}

function confirmPrintFromPreview() {
  const w = printIframeRef.value?.contentWindow;
  if (!w) return;
  requestAnimationFrame(() => {
    try {
      w.focus();
      w.print();
    } catch {
      /* ignore */
    }
  });
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <OrderDetailSkeleton v-if="loading" />
    <p v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {{ error }}
    </p>

    <template v-else-if="order">
      <section class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p class="text-xs font-medium uppercase tracking-wide text-emerald-700">Sifariş</p>
        <div class="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h2 class="text-xl font-semibold text-zinc-900">№ {{ order.id }}</h2>
          <div class="no-print flex flex-wrap gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
              @click="scrollToLines"
            >
              <svg class="h-4 w-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Ətraflı
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
              @click="openPrintPreview"
            >
              <svg class="h-4 w-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Çap et
            </button>
          </div>
        </div>

        <p class="mt-3 text-sm text-zinc-600">Status: {{ order.status?.name ?? '—' }}</p>
        <p class="mt-1 text-sm text-zinc-600">Ümumi: {{ money(order.total) }} ₼</p>
        <p v-if="order.created_at" class="mt-1 text-xs text-zinc-500">{{ order.created_at }}</p>
        <p v-if="order.note" class="mt-3 text-sm text-zinc-600">Qeyd: {{ order.note }}</p>
      </section>

      <section
        v-if="order.products?.length"
        ref="linesSection"
        class="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white shadow-sm"
      >
        <h3 class="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-900">Məhsullar</h3>
        <table class="w-full text-left text-sm">
          <thead class="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th class="px-4 py-3">Məhsul</th>
              <th class="px-4 py-3">Say</th>
              <th class="px-4 py-3">Qiymət</th>
              <th class="px-4 py-3">Cəm</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100">
            <tr v-for="ln in order.products" :key="ln.id">
              <td class="px-4 py-3">{{ ln.name }}</td>
              <td class="px-4 py-3">{{ ln.quantity }}</td>
              <td class="px-4 py-3">{{ money(ln.price) }} ₼</td>
              <td class="px-4 py-3">{{ lineTotal(ln.price, ln.quantity ?? 0) }} ₼</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <Teleport to="body">
      <div
        v-if="printPreviewOpen"
        class="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-preview-title"
        @click.self="closePrintPreview"
      >
        <div
          class="flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200"
        >
          <div class="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
            <div>
              <h2 id="print-preview-title" class="text-base font-semibold text-zinc-900">Çap önizləməsi</h2>
              <p class="mt-0.5 text-xs text-zinc-500">
                Əvvəl sənəd burada görünür; «Çap» Windows çap pəncərəsini açır (Electron-da sistem önizləməsi məhdud ola bilər).
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              aria-label="Bağla"
              @click="closePrintPreview"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <iframe
            ref="printIframeRef"
            class="min-h-[min(55vh,520px)] w-full flex-1 border-0 bg-white"
            title="Çap önizləməsi"
            :srcdoc="printPreviewSrcdoc"
          />
          <div class="flex shrink-0 flex-wrap justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-3">
            <button
              type="button"
              class="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              @click="closePrintPreview"
            >
              Bağla
            </button>
            <button
              type="button"
              class="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              @click="confirmPrintFromPreview"
            >
              Çap
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
