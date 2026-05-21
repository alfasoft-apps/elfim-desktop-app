<script setup lang="ts">
import { computed } from 'vue';
import type { AutoUpdateStatus } from '../types/auto-update-status';

const props = defineProps<{
  status: AutoUpdateStatus | null;
}>();

const emit = defineEmits<{
  check: [];
  install: [];
}>();

const visible = computed(() => {
  const s = props.status;
  if (!s) return false;
  return (
    s.phase === 'available' ||
    s.phase === 'downloading' ||
    s.phase === 'downloaded' ||
    s.phase === 'error' ||
    s.phase === 'checking'
  );
});

const message = computed(() => {
  const s = props.status;
  if (!s) return '';
  switch (s.phase) {
    case 'checking':
      return 'Yeniləmə yoxlanılır…';
    case 'available':
      return `Yeni versiya mövcuddur (v${s.version}). Yüklənir…`;
    case 'downloading':
      return `Yeniləmə yüklənir… ${Math.round(s.percent)}%`;
    case 'downloaded':
      return `Yeniləmə hazırdır (v${s.version}). Quraşdırmaq üçün basın.`;
    case 'error':
      return s.message;
    default:
      return '';
  }
});

const showInstall = computed(() => props.status?.phase === 'downloaded');
const showCheck = computed(() => props.status?.phase === 'error');
</script>

<template>
  <div
    v-if="visible"
    class="border-b px-4 py-2.5 text-sm"
    :class="
      status?.phase === 'error'
        ? 'border-amber-200 bg-amber-50 text-amber-950'
        : 'border-emerald-200 bg-emerald-50 text-emerald-950'
    "
    role="status"
  >
    <div class="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
      <p class="font-medium">{{ message }}</p>
      <div class="flex shrink-0 gap-2">
        <button
          v-if="showCheck"
          type="button"
          class="rounded-lg border border-current/20 bg-white/80 px-3 py-1.5 text-xs font-semibold hover:bg-white"
          @click="emit('check')"
        >
          Yenidən yoxla
        </button>
        <button
          v-if="showInstall"
          type="button"
          class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          @click="emit('install')"
        >
          Quraşdır və yenidən başlat
        </button>
      </div>
    </div>
    <div
      v-if="status?.phase === 'downloading'"
      class="mx-auto mt-2 h-1.5 max-w-4xl overflow-hidden rounded-full bg-emerald-200/80"
    >
      <div
        class="h-full rounded-full bg-emerald-600 transition-[width]"
        :style="{ width: `${Math.min(100, Math.max(0, status.percent))}%` }"
      />
    </div>
  </div>
</template>
