<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { login, syncDesktopAppBundle } from '../api/elfim-api';
import { ROUTES } from '../constants/routes';
import { useSessionAuthStore } from '../stores/sessionAuth';
import { useShoppingCartStore } from '../stores/shoppingCart';
import { readLastAccountEmail } from '../utils/last-account-cache';
import { syncLicenseFingerprintFromSession } from '../utils/license-fingerprint-sync';

const router = useRouter();
const route = useRoute();
const sessionAuth = useSessionAuthStore();
const shoppingCart = useShoppingCartStore();
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

onMounted(() => {
  const last = readLastAccountEmail();
  if (last && !email.value.trim()) email.value = last;
});

async function submit() {
  loading.value = true;
  error.value = null;
  try {
    await login(email.value.trim(), password.value);
    sessionAuth.refresh();
    await syncLicenseFingerprintFromSession();
    void syncDesktopAppBundle(true);
    shoppingCart.hydrateFromStorage();
    const raw = route.query.redirect;
    const nextPath = typeof raw === 'string' && raw.startsWith('/') ? raw : ROUTES.HOME;
    await router.push(nextPath);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Giriş alınmadı.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <section class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-zinc-900">Daxil ol</h2>
      <p class="mt-2 text-sm text-zinc-600">Hesabınıza daxil olun.</p>
      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="block text-xs font-medium text-zinc-700">E-poçt</label>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-zinc-700">Şifrə</label>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <button
          type="submit"
          class="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          :disabled="loading"
        >
          {{ loading ? '…' : 'Daxil ol' }}
        </button>
      </form>
    </section>
  </div>
</template>
