<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ROUTES } from '../../constants/routes';
import { breadcrumbsForRoute } from '../../utils/breadcrumbs';
import { getShareableHashHrefFromFullPath } from '../../utils/app-share-url';

const route = useRoute();
const router = useRouter();

const crumbs = computed(() => breadcrumbsForRoute(route));

const showBack = computed(() => route.name !== 'home');

const shareableHref = computed(() => getShareableHashHrefFromFullPath(route.fullPath));

const copyFeedback = ref<'idle' | 'copied' | 'error'>('idle');
let copyResetTimer: ReturnType<typeof setTimeout> | null = null;

function goBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back();
    return;
  }
  const list = crumbs.value;
  const parentTo = list.length >= 2 ? list[list.length - 2]?.to : undefined;
  void router.push(parentTo ?? ROUTES.HOME);
}

async function copyShareLink() {
  const text = shareableHref.value;
  if (!text) return;

  if (copyResetTimer != null) {
    clearTimeout(copyResetTimer);
    copyResetTimer = null;
  }

  try {
    await navigator.clipboard.writeText(text);
    copyFeedback.value = 'copied';
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      copyFeedback.value = 'copied';
    } catch {
      copyFeedback.value = 'error';
    }
  }

  copyResetTimer = setTimeout(() => {
    copyFeedback.value = 'idle';
    copyResetTimer = null;
  }, 2200);
}

const copyButtonLabel = computed(() => {
  if (copyFeedback.value === 'copied') return 'Kopyalandı';
  if (copyFeedback.value === 'error') return 'Alınmadı';
  return 'Keçidi köçür';
});
</script>

<template>
  <div v-if="crumbs.length" class="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
    <button
      v-if="showBack"
      type="button"
      class="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
      @click="goBack"
    >
      <span aria-hidden="true">←</span>
      Geri
    </button>

    <nav class="flex min-h-9 min-w-0 flex-1 basis-[min(100%,12rem)] items-center" aria-label="Naviqasiya izi">
      <ol class="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm leading-snug text-zinc-600">
        <li v-for="(item, index) in crumbs" :key="`${index}-${item.label}`" class="flex max-w-full items-center gap-1">
          <RouterLink
            v-if="item.to"
            :to="item.to"
            class="truncate rounded px-0.5 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-500"
          >
            {{ item.label }}
          </RouterLink>
          <span v-else class="truncate font-medium text-zinc-900" aria-current="page">{{ item.label }}</span>
          <span v-if="index < crumbs.length - 1" class="shrink-0 text-zinc-400 select-none" aria-hidden="true">
            /
          </span>
        </li>
      </ol>
    </nav>

    <button
      type="button"
      class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
      :class="
        copyFeedback === 'copied'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
          : copyFeedback === 'error'
            ? 'border-red-200 bg-red-50 text-red-800'
            : ''
      "
      :title="
        'Banner/bildiriş üçün cari ekranın hash keçidi (localhost yox). Xüsusi təkliflər story üçün əlavə olaraq #/special-offers yazıla bilər. Nümunə: ' +
        shareableHref
      "
      :aria-label="copyButtonLabel + ' — cari səhifə keçidi'"
      @click="copyShareLink"
    >
      <svg class="h-3.5 w-3.5 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
      {{ copyButtonLabel }}
    </button>
  </div>
</template>
