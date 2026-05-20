<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { fetchMe } from '../api/elfim-api';
import type { UserDto } from '../api/types';
import { ROUTES } from '../constants/routes';
import AccountCardSkeleton from '../components/AccountCardSkeleton.vue';

const user = ref<UserDto | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

function openSpecialOffersStories() {
  window.dispatchEvent(new CustomEvent('show-banners'));
}

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    user.value = await fetchMe();
    if (!user.value) error.value = 'Giriş edin — istifadəçi məlumatı yoxdur.';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Məlumat alınmadı.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <section class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-zinc-900">Hesab</h2>

      <AccountCardSkeleton v-if="loading" />
      <p v-else-if="error" class="mt-6 text-sm text-amber-700">{{ error }}</p>
      <template v-else-if="user">
        <p class="mt-6 text-base font-medium text-zinc-900">{{ user.name || '(adsız)' }}</p>
        <p class="mt-1 text-sm text-zinc-500">{{ user.email }}</p>
        <p class="mt-1 text-sm text-zinc-500">{{ user.phone ?? '' }}</p>
      </template>

      <div class="mt-6 flex flex-col gap-2">
        <RouterLink
          :to="ROUTES.ORDERS"
          class="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-800 transition hover:border-emerald-400 hover:bg-emerald-50"
        >
          Sifarişlərim
        </RouterLink>
        <RouterLink
          :to="ROUTES.NOTIFICATIONS"
          class="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-800 transition hover:border-emerald-400 hover:bg-emerald-50"
        >
          Bildirişlər
        </RouterLink>
        <button
          type="button"
          class="rounded-lg border border-zinc-200 px-4 py-3 text-left text-sm font-medium text-zinc-800 transition hover:border-emerald-400 hover:bg-emerald-50"
          @click="openSpecialOffersStories"
        >
          Xüsusi Təkliflər
        </button>
        <RouterLink
          :to="ROUTES.PROFILE"
          class="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-800 transition hover:border-emerald-400 hover:bg-emerald-50"
        >
          Profil parametrləri
        </RouterLink>
      </div>
    </section>
  </div>
</template>
