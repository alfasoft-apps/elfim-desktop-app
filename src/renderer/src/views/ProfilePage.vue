<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { fetchMe } from '../api/elfim-api';
import type { UserDto } from '../api/types';
import AccountCardSkeleton from '../components/AccountCardSkeleton.vue';

const user = ref<UserDto | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    user.value = await fetchMe();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Profil yüklənmədi.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <section class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-zinc-900">Profil parametrləri</h2>
      <p class="mt-2 text-sm text-zinc-600">Hesab məlumatlarınız.</p>

      <AccountCardSkeleton v-if="loading" />
      <p v-else-if="error" class="mt-6 text-sm text-red-600">{{ error }}</p>
      <form v-else class="mt-6 space-y-4" @submit.prevent>
        <div>
          <label class="block text-xs font-medium text-zinc-700">Ad</label>
          <input
            type="text"
            class="mt-1 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm"
            :value="user?.name ?? ''"
            disabled
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-zinc-700">E-poçt</label>
          <input
            type="email"
            class="mt-1 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm"
            :value="user?.email ?? ''"
            disabled
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-zinc-700">Telefon</label>
          <input
            type="tel"
            class="mt-1 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm"
            :value="user?.phone ?? ''"
            disabled
          />
        </div>
      </form>
    </section>
  </div>
</template>
