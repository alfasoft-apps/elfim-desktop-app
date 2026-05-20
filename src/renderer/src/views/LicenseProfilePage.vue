<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import type { LicenseDiagnostics } from '../types/license-diagnostics';
import type { UserDto } from '../api/types';
import { ROUTES } from '../constants/routes';
import { emailFromStoredJwt, syncLicenseFingerprintFromSession } from '../utils/license-fingerprint-sync';
import { readLastAccountEmail } from '../utils/last-account-cache';
import { clearLicenseConfigGate, readLicenseConfigGate, type LicenseConfigGatePayload } from '../utils/license-config-gate';
import { useSessionAuthStore } from '../stores/sessionAuth';
import { useAppDataCacheStore } from '../stores/appDataCache';

const TOKEN_KEY = 'auth_token';

const router = useRouter();
const sessionAuth = useSessionAuthStore();
const { isAuthenticated } = storeToRefs(sessionAuth);
const cacheStore = useAppDataCacheStore();

const profileEmail = computed(() => {
  const raw = cacheStore.cache?.profile;
  if (!raw || typeof raw !== 'object') return null;
  const em = (raw as UserDto).email;
  return typeof em === 'string' && em.includes('@') ? em.trim().toLowerCase() : null;
});

const lastLoginEmail = computed(() => readLastAccountEmail());

const displayEmail = computed(
  () => emailFromStoredJwt() ?? profileEmail.value ?? lastLoginEmail.value,
);

const gateAlert = ref<LicenseConfigGatePayload | null>(null);

const diagnostics = ref<LicenseDiagnostics | null>(null);
const diagnosticsLoading = ref(true);
const diagnosticsError = ref<string | null>(null);
const copyHint = ref<string | null>(null);

const publicIp = ref<string | null>(null);
const publicIpLoading = ref(true);

onMounted(async () => {
  gateAlert.value = readLicenseConfigGate();
  diagnosticsLoading.value = true;
  diagnosticsError.value = null;
  publicIpLoading.value = true;
  try {
    await syncLicenseFingerprintFromSession();
    const diagPromise =
      typeof window.elfim?.getLicenseDiagnostics === 'function'
        ? window.elfim.getLicenseDiagnostics()
        : Promise.resolve(null);
    const ipPromise =
      typeof window.elfim?.getPublicIp === 'function'
        ? window.elfim.getPublicIp()
        : Promise.resolve(null);

    const [diag, ip] = await Promise.all([
      diagPromise.catch(() => null),
      ipPromise.catch(() => null),
    ]);

    diagnostics.value = diag;
    publicIp.value = ip;

    if (!diag) {
      diagnosticsError.value = 'Lisenziya diaqnostikası əlçatan deyil.';
    }
  } catch (e) {
    diagnosticsError.value = e instanceof Error ? e.message : 'Naməlum xəta';
  } finally {
    diagnosticsLoading.value = false;
    publicIpLoading.value = false;
  }
});

async function copyText(label: string, value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    copyHint.value = `${label} kopyalandı`;
    window.setTimeout(() => {
      copyHint.value = null;
    }, 2000);
  } catch {
    copyHint.value = 'Kopyalama alınmadı';
    window.setTimeout(() => {
      copyHint.value = null;
    }, 2500);
  }
}

function retryAfterAdminFix(): void {
  clearLicenseConfigGate();
  gateAlert.value = null;
  void router.replace({ path: ROUTES.HOME, replace: true });
}

function signOut(): void {
  clearLicenseConfigGate();
  gateAlert.value = null;
  localStorage.removeItem(TOKEN_KEY);
  try {
    localStorage.removeItem('elfim-cart');
  } catch {
    /* ignore */
  }
  sessionAuth.refresh();
  void router.replace({ name: 'signin', replace: true });
}

const licenseHex = computed(() => diagnostics.value?.licenseFingerprintToken ?? '');
</script>

<template>
  <div class="mx-auto max-w-lg pb-8">
    <div
      v-if="gateAlert?.message"
      class="mb-5 rounded-2xl border border-amber-300/90 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 shadow-sm"
      role="alert"
    >
      {{ gateAlert.message }}
    </div>

    <section class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-900/5">
      <div class="divide-y divide-zinc-100 border-b border-zinc-100 bg-zinc-50/80">
        <div class="px-5 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">E-poçt</p>
          <p class="mt-0.5 break-all font-mono text-sm font-semibold text-zinc-900">
            {{ displayEmail ?? '—' }}
          </p>
          <p v-if="!isAuthenticated" class="mt-1 text-xs text-amber-700">
            Sessiya bitibsə çıxış edib yenidən daxil olun.
          </p>
        </div>
        <div class="px-5 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Serverdə görünən IP</p>
          <p class="mt-0.5 font-mono text-sm font-semibold text-zinc-900">
            <span v-if="publicIpLoading" class="text-zinc-400">…</span>
            <span v-else>{{ publicIp ?? '—' }}</span>
          </p>
          <p
            v-if="!publicIpLoading && !publicIp && diagnostics?.hostname"
            class="mt-1 text-xs text-zinc-500"
          >
            Host: <span class="font-mono text-zinc-700">{{ diagnostics.hostname }}</span>
          </p>
        </div>
      </div>

      <div class="px-5 py-4">
        <div v-if="diagnosticsLoading" class="h-24 animate-pulse rounded-xl bg-zinc-100" />

        <p
          v-else-if="diagnosticsError"
          class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {{ diagnosticsError }}
        </p>

        <template v-else>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Lisenziya kodu</p>
            <p
              v-if="copyHint"
              class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900"
            >
              {{ copyHint }}
            </p>
          </div>

          <code
            class="mt-3 block max-h-40 overflow-auto break-all rounded-xl bg-zinc-900 px-3 py-3 font-mono text-[11px] leading-relaxed text-emerald-100"
          >
            {{ licenseHex || '—' }}
          </code>

          <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              class="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              :disabled="!licenseHex"
              @click="copyText('Lisenziya kodu', licenseHex)"
            >
              Kodu kopyala
            </button>
            <button
              type="button"
              class="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
              @click="retryAfterAdminFix"
            >
              Yenidən cəhd et
            </button>
            <button
              type="button"
              class="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
              @click="signOut"
            >
              Çıxış
            </button>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>
