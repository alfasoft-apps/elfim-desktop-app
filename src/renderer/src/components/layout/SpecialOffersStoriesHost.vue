<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { fetchBanners } from '../../api/elfim-api';
import type { BannerDto } from '../../api/types';
import { useSpecialOffersMetaStore } from '../../stores/specialOffersMeta';
import { useNetworkStatusStore } from '../../stores/networkStatus';
import { resolveAppNavigationLink } from '../../utils/app-share-url';

const loading = ref(true);
const banners = ref<BannerDto[]>([]);
const router = useRouter();
const offersMeta = useSpecialOffersMetaStore();
const network = useNetworkStatusStore();
const { isOnline } = storeToRefs(network);

const isOpen = ref(false);
const isAnimatingOut = ref(false);
const currentIndex = ref(0);
const progress = ref(0);
const isTransitioning = ref(false);
const isPaused = ref(false);

const STORY_DURATION = 5000;

let progressTimer: ReturnType<typeof setInterval> | null = null;

const currentBanner = computed(() => banners.value[currentIndex.value]);
const hasLink = computed(() => Boolean(currentBanner.value?.link?.trim()));

const panelBg = computed(() => {
  const c = currentBanner.value?.back_color?.trim();
  return c || '#0f172a';
});

const textCol = computed(() => {
  const c = currentBanner.value?.text_color?.trim();
  return c || '#ffffff';
});

function clearProgressTimer() {
  if (progressTimer != null) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function handleClose() {
  isAnimatingOut.value = true;
  setTimeout(() => {
    isOpen.value = false;
    isAnimatingOut.value = false;
    clearProgressTimer();
  }, 380);
}

function goToPrevious() {
  if (currentIndex.value > 0 && !isTransitioning.value) {
    isTransitioning.value = true;
    progress.value = 0;
    currentIndex.value -= 1;
    setTimeout(() => {
      isTransitioning.value = false;
    }, 40);
  }
}

function goToNext() {
  if (!banners.value.length) return;
  if (currentIndex.value < banners.value.length - 1 && !isTransitioning.value) {
    isTransitioning.value = true;
    progress.value = 0;
    currentIndex.value += 1;
    setTimeout(() => {
      isTransitioning.value = false;
    }, 40);
  } else if (currentIndex.value >= banners.value.length - 1) {
    handleClose();
  }
}

function openStories() {
  if (!banners.value.length) return;
  currentIndex.value = 0;
  progress.value = 0;
  isOpen.value = true;
}

function handleReadMore() {
  const link = currentBanner.value?.link?.trim();
  if (!link) return;
  const resolved = resolveAppNavigationLink(link);
  if (!resolved) return;
  if (resolved.type === 'internal') {
    handleClose();
    void router.push(resolved.path);
    return;
  }
  window.open(resolved.url, '_blank', 'noopener,noreferrer');
}

function onStoriesOpenRequest() {
  openStories();
}

function onKeydown(e: KeyboardEvent) {
  if (!isOpen.value) return;
  if (e.key === 'Escape') handleClose();
  else if (e.key === 'ArrowLeft') goToPrevious();
  else if (e.key === 'ArrowRight') goToNext();
  else if (e.key === ' ') {
    e.preventDefault();
    isPaused.value = !isPaused.value;
  }
}

async function loadBanners() {
  loading.value = true;
  try {
    const res = await fetchBanners();
    banners.value = res.banners;
    offersMeta.hydrateFromResult(res);
  } catch {
    /* offline — mövcud siyahı saxlanılır */
  } finally {
    loading.value = false;
  }
}

watch([isOpen, currentIndex, isAnimatingOut, isTransitioning, isPaused], () => {
  clearProgressTimer();
  if (!isOpen.value || !banners.value.length || isAnimatingOut.value || isTransitioning.value || isPaused.value)
    return;

  progressTimer = setInterval(() => {
    progress.value += 100 / (STORY_DURATION / 30);
    if (progress.value >= 100) {
      progress.value = 0;
      if (currentIndex.value < banners.value.length - 1) {
        goToNext();
      } else {
        handleClose();
      }
    }
  }, 30);
});

watch(isOpen, (v) => {
  document.body.style.overflow = v ? 'hidden' : '';
});

watch(isOnline, (online) => {
  if (online) void loadBanners();
});

onMounted(async () => {
  window.addEventListener('show-banners', onStoriesOpenRequest);
  window.addEventListener('keydown', onKeydown);
  await loadBanners();
});

onUnmounted(() => {
  window.removeEventListener('show-banners', onStoriesOpenRequest);
  window.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
  clearProgressTimer();
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen && banners.length && !loading"
      class="story-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      :class="{ closing: isAnimatingOut }"
    >
      <div
        class="story-card relative flex h-full w-full max-h-[800px] flex-col overflow-hidden shadow-2xl md:h-[90vh] md:max-w-[420px] md:rounded-2xl"
        :class="{ closing: isAnimatingOut }"
      >
        <div class="absolute left-0 right-0 top-0 z-30 flex gap-1 p-3 md:p-4">
          <div
            v-for="(_, idx) in banners"
            :key="idx"
            class="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
          >
            <div
              class="h-full rounded-full bg-white"
              :style="{
                width:
                  idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                transition: 'width 0.03s linear',
              }"
            />
          </div>
        </div>

        <div class="absolute left-0 right-0 top-8 z-30 flex items-center justify-between px-4 md:top-10">
          <div class="flex items-center gap-2">
            <div class="rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">
              <span class="text-sm font-medium text-white">{{ currentIndex + 1 }} / {{ banners.length }}</span>
            </div>
            <span
              v-if="isPaused"
              class="rounded-full bg-white/20 px-2 py-1 text-xs text-white/80 backdrop-blur-sm"
            >
              Pauza
            </span>
          </div>
          <button
            type="button"
            class="close-btn flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm"
            aria-label="Bağla"
            @click="handleClose"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="absolute inset-0" :style="{ backgroundColor: panelBg }">
          <div v-if="currentBanner?.image" class="absolute inset-0">
            <img :src="currentBanner.image" :alt="currentBanner.title ?? ''" class="h-full w-full object-cover" />
            <div class="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/50" />
          </div>

          <div
            class="absolute left-0 top-0 z-20 h-full w-1/3 cursor-pointer"
            @click="goToPrevious"
            @mousedown="isPaused = true"
            @mouseup="isPaused = false"
            @mouseleave="isPaused = false"
          />
          <div
            class="absolute right-0 top-0 z-20 h-full w-1/3 cursor-pointer"
            @click="goToNext"
            @mousedown="isPaused = true"
            @mouseup="isPaused = false"
            @mouseleave="isPaused = false"
          />

          <div
            :key="currentIndex"
            class="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 md:px-12"
          >
            <h2
              class="content-fade mb-4 text-center text-2xl font-bold md:text-3xl lg:text-4xl"
              :style="{ color: textCol, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }"
            >
              {{ currentBanner?.title }}
            </h2>
            <p
              class="content-fade-delay max-w-md text-center text-base leading-relaxed md:text-lg lg:text-xl"
              :style="{ color: textCol, opacity: 0.95, textShadow: '0 1px 8px rgba(0,0,0,0.3)' }"
            >
              {{ currentBanner?.content }}
            </p>
          </div>
        </div>

        <button
          type="button"
          class="nav-btn absolute left-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm md:h-12 md:w-12"
          :disabled="currentIndex === 0 || isTransitioning"
          aria-label="Əvvəlki"
          @click="goToPrevious"
        >
          <svg class="h-6 w-6 md:h-7 md:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          class="nav-btn absolute right-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm md:h-12 md:w-12"
          :disabled="isTransitioning"
          aria-label="Növbəti"
          @click="goToNext"
        >
          <svg class="h-6 w-6 md:h-7 md:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div
          v-if="hasLink"
          :key="'cta-' + currentIndex"
          class="content-fade-delay-2 absolute bottom-8 left-0 right-0 z-30 flex justify-center px-4 md:bottom-10"
        >
          <button
            type="button"
            class="read-more-btn rounded-full bg-white px-8 py-3 text-sm font-semibold text-gray-900 shadow-lg md:px-10 md:py-3.5 md:text-base"
            @click="handleReadMore"
          >
            Daha Çox
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Next.js special-offers story overlay ilə uyğun hover və animasiyalar */
.story-overlay {
  animation: storyFadeIn 0.4s ease-out forwards;
}
.story-overlay.closing {
  animation: storyFadeOut 0.4s ease-out forwards;
}

.story-card {
  animation: storyScaleIn 0.4s ease-out forwards;
}
.story-card.closing {
  animation: storyScaleOut 0.4s ease-out forwards;
}

.content-fade {
  animation: storyContentFade 0.5s ease-out 0.1s forwards;
  opacity: 0;
}
.content-fade-delay {
  animation: storyContentFade 0.5s ease-out 0.2s forwards;
  opacity: 0;
}
.content-fade-delay-2 {
  animation: storyContentFade 0.5s ease-out 0.3s forwards;
  opacity: 0;
}

.read-more-btn {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.read-more-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}
.read-more-btn:active {
  transform: scale(0.98);
}

.nav-btn {
  transition: all 0.2s ease;
}
.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-50%) scale(1.1);
}
.nav-btn:active:not(:disabled) {
  transform: translateY(-50%) scale(0.95);
}
.nav-btn:disabled {
  opacity: 0.3;
}

.close-btn {
  transition: all 0.2s ease;
}
.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

@keyframes storyFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes storyFadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
@keyframes storyScaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes storyScaleOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}
@keyframes storyContentFade {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
