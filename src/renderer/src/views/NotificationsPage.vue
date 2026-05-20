<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { fetchMyNotifications } from '../api/elfim-api';
import type { NotificationsGroupedResponse } from '../api/types';
import { ROUTES } from '../constants/routes';
import { useSessionAuthStore } from '../stores/sessionAuth';

const auth = useSessionAuthStore();
const { isAuthenticated } = storeToRefs(auth);
const loading = ref(true);
const error = ref<string | null>(null);
const grouped = ref<NotificationsGroupedResponse>({});

const sortedDays = computed(() =>
  Object.keys(grouped.value).sort((a, b) => {
    const da = parseAzDate(a);
    const db = parseAzDate(b);
    return db.getTime() - da.getTime();
  }),
);

function parseAzDate(dayKey: string): Date {
  const m = dayKey.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return new Date(0);
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

onMounted(async () => {
  if (!isAuthenticated.value) {
    loading.value = false;
    error.value = 'Bildirişləri görmək üçün daxil olun.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    grouped.value = await fetchMyNotifications();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Yüklənmədi.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="mx-auto max-w-lg space-y-4">
    <p class="text-sm text-zinc-500">
      Sistem və təklif bildirişləri burada göstərilir. Windows-da yeni bildirişlər keş yenilənəndə bildiriş mərkəzində də çıxa bilər (icazə
      verildikdə).
    </p>

    <div v-if="loading" class="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">Yüklənir…</div>
    <div
      v-else-if="error"
      class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      {{ error }}
      <RouterLink :to="ROUTES.SIGNIN" class="mt-2 block font-medium text-emerald-800 underline"> Daxil ol </RouterLink>
    </div>
    <div
      v-else-if="sortedDays.length === 0"
      class="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600"
    >
      Hal-hazırda bildiriş yoxdur.
    </div>
    <template v-else>
      <section v-for="day in sortedDays" :key="day" class="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <h2 class="border-b border-zinc-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-teal-900">
          {{ day }}
        </h2>
        <ul class="divide-y divide-zinc-100">
          <li
            v-for="(n, idx) in grouped[day]"
            :key="n.id ?? `${day}-${idx}`"
            class="px-4 py-3"
            :class="n.read_at ? 'opacity-70' : ''"
          >
            <p class="font-semibold text-zinc-900">{{ n.data?.title ?? 'Bildiriş' }}</p>
            <p v-if="n.data?.desc" class="mt-1 text-sm text-zinc-600">{{ n.data.desc }}</p>
            <a
              v-if="n.data?.url"
              :href="n.data.url"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-2 inline-block text-sm font-medium text-emerald-700 hover:underline"
            >
              Ətraflı
            </a>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
