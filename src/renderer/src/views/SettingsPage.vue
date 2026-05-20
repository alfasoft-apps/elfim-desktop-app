<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { AutoUpdateStatus } from '../types/auto-update-status';
import type { LicenseDiagnostics } from '../types/license-diagnostics';

const diagnostics = ref<LicenseDiagnostics | null>(null);
const diagnosticsError = ref<string | null>(null);
const diagnosticsLoading = ref(true);
const copyHint = ref<string | null>(null);

const logsPath = ref<string | null>(null);
const logsError = ref<string | null>(null);

const updateSupported = ref(false);
const updatePhase = ref<AutoUpdateStatus | null>(null);
const updateCheckBusy = ref(false);
let removeUpdateListener: (() => void) | undefined;

const updateHint = computed(() => {
  const s = updatePhase.value;
  if (!s) return null;
  switch (s.phase) {
    case 'checking':
      return 'Checking for updates…';
    case 'not-available':
      return 'No update available — you are on the latest version.';
    case 'available':
      return `Update available: v${s.version}. Downloading…`;
    case 'downloading':
      return `Downloading… ${Math.round(s.percent)}%`;
    case 'downloaded':
      return `Update downloaded (v${s.version}). Restart to install.`;
    case 'error':
      return s.message;
    default:
      return null;
  }
});

/** `collectHardwareParts()` məntiqi: `cpu`/`gpu` dəyərləri öz içində `|` ehtiva edə bilər — sadə split işləmir. */
type HwRow = { label: string; value: string };

function parseHardwareSummary(raw: string): HwRow[] {
  const LABELS: Record<string, string> = {
    sys: 'Sistem GUID',
    'sys-serial': 'Sistem seriyası',
    board: 'Ana plata',
    cpu: 'Prosessor',
    gpu: 'Qrafika adapteri',
  };

  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('fallback:')) {
    const rest = trimmed.slice('fallback:'.length);
    const [host = '', user = ''] = rest.split('|');
    const rows: HwRow[] = [];
    if (host) rows.push({ label: 'Host adı', value: host });
    if (user) rows.push({ label: 'İstifadəçi', value: user });
    return rows;
  }

  const gpuTag = '|gpu:';
  const gpuIdx = trimmed.lastIndexOf(gpuTag);
  let gpuVal = '';
  let middle = trimmed;
  if (gpuIdx !== -1) {
    gpuVal = trimmed.slice(gpuIdx + gpuTag.length);
    middle = trimmed.slice(0, gpuIdx);
  }

  const cpuTag = '|cpu:';
  const cpuIdx = middle.indexOf(cpuTag);
  let cpuVal = '';
  let head = middle;
  if (cpuIdx !== -1) {
    cpuVal = middle.slice(cpuIdx + cpuTag.length);
    head = middle.slice(0, cpuIdx);
  }

  const rows: HwRow[] = [];
  for (const segment of head.split('|').filter(Boolean)) {
    const i = segment.indexOf(':');
    if (i === -1) continue;
    const key = segment.slice(0, i);
    const val = segment.slice(i + 1);
    rows.push({ label: LABELS[key] ?? key, value: val });
  }

  if (cpuVal) rows.push({ label: LABELS.cpu!, value: cpuVal });
  if (gpuVal) rows.push({ label: LABELS.gpu!, value: gpuVal });

  return rows;
}

const hardwareRows = computed(() => {
  const d = diagnostics.value;
  if (!d?.hardwareSummary) return [];
  return parseHardwareSummary(d.hardwareSummary);
});

function platformLabel(platform: string): string {
  const map: Record<string, string> = {
    win32: 'Windows',
    darwin: 'macOS',
    linux: 'Linux',
  };
  return map[platform] ?? platform;
}

onMounted(async () => {
  diagnosticsLoading.value = true;
  diagnosticsError.value = null;
  try {
    if (typeof window.elfim?.getLicenseDiagnostics === 'function') {
      diagnostics.value = await window.elfim.getLicenseDiagnostics();
    } else {
      diagnosticsError.value = 'Bu mühitdə lisenziya diaqnostikası əlçatan deyil.';
    }
  } catch (e) {
    diagnosticsError.value = e instanceof Error ? e.message : 'Naməlum xəta';
  } finally {
    diagnosticsLoading.value = false;
  }

  try {
    if (typeof window.elfim?.getLogsDirectory === 'function') {
      logsPath.value = await window.elfim.getLogsDirectory();
    }
  } catch (e) {
    logsError.value = e instanceof Error ? e.message : 'Log qovluğu alınmadı';
  }

  try {
    if (typeof window.elfim?.isAutoUpdateSupported === 'function') {
      updateSupported.value = await window.elfim.isAutoUpdateSupported();
      if (updateSupported.value && typeof window.elfim.onUpdateStatus === 'function') {
        removeUpdateListener = window.elfim.onUpdateStatus((s) => {
          updatePhase.value = s;
        });
      }
    }
  } catch {
    updateSupported.value = false;
  }
});

onUnmounted(() => {
  removeUpdateListener?.();
});

async function checkUpdatesClick(): Promise<void> {
  if (typeof window.elfim?.checkForUpdates !== 'function') return;
  updateCheckBusy.value = true;
  try {
    await window.elfim.checkForUpdates();
  } finally {
    window.setTimeout(() => {
      updateCheckBusy.value = false;
    }, 600);
  }
}

async function quitAndInstallClick(): Promise<void> {
  if (typeof window.elfim?.quitAndInstallUpdate !== 'function') return;
  await window.elfim.quitAndInstallUpdate();
}

async function openLogsFolder(): Promise<void> {
  logsError.value = null;
  try {
    if (typeof window.elfim?.openLogsDirectory === 'function') {
      logsPath.value = await window.elfim.openLogsDirectory();
    }
  } catch (e) {
    logsError.value = e instanceof Error ? e.message : 'Qovluq açılmadı';
  }
}

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
</script>

<template>
  <div class="mx-auto max-w-3xl pb-10">
    <!-- Müştəri və avadanlıq -->
    <section
      class="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-900/5"
    >
      <div class="border-b border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-zinc-50/80 px-6 py-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h2 class="text-lg font-semibold tracking-tight text-zinc-900">Müştəri və avadanlıq</h2>
            <p class="mt-2 max-w-prose text-sm leading-relaxed text-zinc-600">
              Aşağıdakı <strong class="font-medium text-zinc-800">lisenziya kodu</strong> bu kompüterə məxsusdur.
              <strong class="font-medium text-zinc-800">Kopyala</strong> düyməsi ilə panoya köçürüb administratora göndərin
              — hesabınızın bu cihazda işləməsini təsdiqləmək üçün lazım ola bilər.
            </p>
          </div>
          <transition
            enter-active-class="transition duration-200"
            enter-from-class="opacity-0 translate-y-1"
            leave-active-class="transition duration-150"
            leave-to-class="opacity-0"
          >
            <p
              v-if="copyHint"
              class="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900"
            >
              {{ copyHint }}
            </p>
          </transition>
        </div>
      </div>

      <div class="p-6">
        <!-- Loading -->
        <div
          v-if="diagnosticsLoading"
          class="flex animate-pulse flex-col gap-4"
          aria-busy="true"
          aria-label="Yüklənir"
        >
          <div class="h-28 rounded-xl bg-zinc-100" />
          <div class="grid gap-3 sm:grid-cols-3">
            <div v-for="n in 3" :key="n" class="h-16 rounded-xl bg-zinc-100" />
          </div>
          <div class="h-24 rounded-xl bg-zinc-100" />
        </div>

        <p v-else-if="diagnosticsError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {{ diagnosticsError }}
        </p>

        <template v-else-if="diagnostics">
          <!-- Lisenziya — əsas kart -->
          <div
            class="relative overflow-hidden rounded-2xl border-2 border-emerald-200/80 bg-gradient-to-b from-emerald-50/80 to-white p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]"
          >
            <div
              class="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl"
            />
            <div class="relative">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="inline-flex items-center rounded-full bg-emerald-600/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800"
                >
                  Lisenziya kodu
                </span>
                <span class="text-[11px] text-zinc-500">64 simvolluq unikal kod</span>
              </div>
              <p class="mt-3 break-all font-mono text-[13px] leading-[1.65] tracking-wide text-zinc-900">
                {{ diagnostics.licenseFingerprintToken }}
              </p>
              <button
                type="button"
                class="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-700 active:scale-[0.98]"
                @click="copyText('Lisenziya kodu', diagnostics.licenseFingerprintToken)"
              >
                Kopyala
              </button>
            </div>
          </div>

          <!-- Tətbiq üzrə stat kartları -->
          <div class="mt-6 grid gap-3 sm:grid-cols-3">
            <div
              class="rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-4 py-3 shadow-sm"
            >
              <p class="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Versiya</p>
              <p class="mt-1 text-sm font-semibold text-zinc-900">v{{ diagnostics.appVersion }}</p>
            </div>
            <div
              class="rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-4 py-3 shadow-sm"
            >
              <p class="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Əməliyyat sistemi</p>
              <p class="mt-1 text-sm font-semibold text-zinc-900">
                {{ platformLabel(diagnostics.platform) }}
              </p>
            </div>
            <div
              class="rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-4 py-3 shadow-sm"
            >
              <p class="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Host adı</p>
              <p class="mt-1 break-all font-mono text-xs font-semibold text-zinc-900">
                {{ diagnostics.hostname }}
              </p>
            </div>
          </div>

          <!-- E-poçt + barmaq izi versiyası -->
          <div class="mt-6 flex flex-wrap gap-3">
            <div
              class="flex min-w-[200px] flex-1 items-center gap-3 rounded-xl border px-4 py-3"
              :class="
                diagnostics.licenseEmailBound
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : 'border-amber-200 bg-amber-50/50'
              "
            >
              <span
                class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                :class="diagnostics.licenseEmailBound ? 'bg-emerald-200/80' : 'bg-amber-200/80'"
                aria-hidden="true"
              >
                <span
                  class="h-2.5 w-2.5 rounded-full"
                  :class="diagnostics.licenseEmailBound ? 'bg-emerald-700' : 'bg-amber-600'"
                />
              </span>
              <div class="min-w-0">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                  Hesabınızla əlaqələndirilib
                </p>
                <p class="mt-0.5 text-sm font-medium text-zinc-900">
                  {{
                    diagnostics.licenseEmailBound
                      ? 'Bəli — giriş ünvanınız kodla uyğunlaşdırılıb'
                      : 'Hələ yox — giriş etdikdən sonra yenilənəcək'
                  }}
                </p>
              </div>
            </div>
            <div
              class="flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Kodun versiyası
                </p>
                <p class="mt-0.5 font-mono text-lg font-semibold text-zinc-900">
                  {{ diagnostics.fingerprintVersion }}
                </p>
              </div>
            </div>
          </div>

          <!-- Texniki detallar -->
          <div class="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50/50">
            <div class="border-b border-zinc-200/80 px-5 py-3">
              <h3 class="text-sm font-semibold text-zinc-900">Texniki detallar</h3>
              <p class="mt-0.5 text-xs text-zinc-500">
                Administrator üçün — avadanlıq toxumu və xam məlumatlar.
              </p>
            </div>
            <div class="divide-y divide-zinc-200/80 px-5 py-2">
              <div class="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                <dt class="shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:w-44">
                  Avadanlıq toxumu
                </dt>
                <dd class="min-w-0 flex-1">
                  <code
                    class="block break-all rounded-lg bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-800 shadow-sm ring-1 ring-zinc-200/80"
                  >
                    {{ diagnostics.hardwareSeedSha256 }}
                  </code>
                </dd>
              </div>
            </div>

            <!-- Avadanlıq cədvəli -->
            <div class="border-t border-zinc-200/80">
              <p class="px-5 pt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Avadanlıq xülasəsi
              </p>
              <div class="p-5 pt-3">
                <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                  <table class="w-full text-left text-sm">
                    <tbody class="divide-y divide-zinc-100">
                      <tr
                        v-for="(row, idx) in hardwareRows"
                        :key="idx"
                        class="transition-colors hover:bg-zinc-50/80"
                      >
                        <th
                          scope="row"
                          class="w-[38%] max-w-[200px] whitespace-normal break-words bg-zinc-50/90 px-4 py-3 align-top text-xs font-semibold text-zinc-700"
                        >
                          {{ row.label }}
                        </th>
                        <td class="px-4 py-3 align-top text-xs leading-relaxed text-zinc-800">
                          <span class="break-words font-mono">{{ row.value }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-if="hardwareRows.length === 0" class="py-6 text-center text-sm text-zinc-500">
                  Avadanlıq məlumatı boşdur.
                </p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </section>

    <section
      v-if="updateSupported"
      class="mt-8 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-900/5"
    >
      <div class="border-b border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-zinc-50/80 px-6 py-5">
        <h2 class="text-lg font-semibold tracking-tight text-zinc-900">Yeniləmələr</h2>
        <p class="mt-2 max-w-prose text-sm leading-relaxed text-zinc-600">
          Quraşdırılmış tətbiq bir neçə saniyə sonra serverdə yeni versiya axtarır; tapılsa avtomatik yüklənir.
          Hazır olanda bir dəfə sıxıb quraşdıra bilərsiniz.
        </p>
      </div>
      <div class="space-y-4 p-6">
        <p v-if="updateHint" class="text-sm text-zinc-800">
          {{ updateHint }}
        </p>
        <div
          v-if="updatePhase?.phase === 'downloading'"
          class="h-2 overflow-hidden rounded-full bg-zinc-100"
          role="progressbar"
          :aria-valuenow="Math.round(updatePhase.percent)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="h-full rounded-full bg-emerald-600 transition-[width] duration-300"
            :style="{ width: `${Math.min(100, Math.max(0, updatePhase.percent))}%` }"
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50"
            :disabled="updateCheckBusy"
            @click="checkUpdatesClick"
          >
            Check for updates
          </button>
          <button
            v-if="updatePhase?.phase === 'downloaded'"
            type="button"
            class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-700 active:scale-[0.98]"
            @click="quitAndInstallClick"
          >
            Install and restart
          </button>
        </div>
      </div>
    </section>

    <section
      class="mt-8 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-900/5"
    >
      <div class="border-b border-zinc-100 bg-zinc-50/80 px-6 py-5">
        <h2 class="text-lg font-semibold tracking-tight text-zinc-900">API logları</h2>
        <p class="mt-2 max-w-prose text-sm leading-relaxed text-zinc-600">
          Fayllar tarix üzrə alt qovluqlarda saxlanılır:
          <code class="rounded bg-zinc-200/80 px-1 text-xs">logs/İl/Ay/Gün/api-http.log</code>
          və
          <code class="rounded bg-zinc-200/80 px-1 text-xs">api-parse-error.log</code>
          (eyni gün qovluğunda). JSON sətirləri formatındadır.
        </p>
      </div>
      <div class="space-y-4 p-6">
        <p v-if="logsError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {{ logsError }}
        </p>
        <p v-if="logsPath" class="break-all font-mono text-xs text-zinc-600">
          {{ logsPath }}
        </p>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          @click="openLogsFolder"
        >
          Log qovluğunu aç
        </button>
      </div>
    </section>
  </div>
</template>
