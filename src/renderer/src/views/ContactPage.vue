<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { fetchCompanyPhones } from '../api/elfim-api';
import type { CompanyPhoneNumber } from '../api/types';

const phones = ref<CompanyPhoneNumber[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const list = await fetchCompanyPhones();
    phones.value = [...list].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
    if (phones.value.length === 0) error.value = 'Telefon siyahısı boşdur.';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Əlaqə məlumatı alınmadı.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <section class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-zinc-900">Əlaqə</h2>
      <p class="mt-2 text-sm text-zinc-600">Şirkət və bölmə telefonları.</p>
      <p v-if="loading" class="mt-4 text-sm text-zinc-500">Yüklənir…</p>
      <p v-else-if="error" class="mt-4 text-sm text-amber-700">{{ error }}</p>
      <ul v-else class="mt-6 space-y-3">
        <li
          v-for="p in phones"
          :key="p.id"
          class="flex flex-col rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <span class="font-medium text-zinc-900">{{ p.name }}</span>
          <a
            :href="`tel:${String(p.phone_number ?? '').replace(/\s/g, '')}`"
            class="mt-1 font-mono text-emerald-700 hover:underline sm:mt-0"
          >
            {{ p.phone_number }}
          </a>
        </li>
      </ul>
    </section>
  </div>
</template>
