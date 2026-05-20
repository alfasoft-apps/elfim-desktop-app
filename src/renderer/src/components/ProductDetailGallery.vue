<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useCachedImageUrls } from '../composables/useCachedImageUrls';
import CachedImage from './CachedImage.vue';
import ProductLightbox from './ProductLightbox.vue';

const props = defineProps<{
  cover?: string | null;
  images?: { id: number; url?: string | null }[];
  alt?: string;
}>();

const selectedIndex = ref(0);
const lightboxOpen = ref(false);

const rawUrls = computed(() => {
  const fromGallery = (props.images ?? []).map((img) => img.url ?? undefined);
  if (fromGallery.length) return fromGallery;
  return props.cover ? [props.cover] : [];
});

const urls = useCachedImageUrls(() => rawUrls.value);

const hasMany = computed(() => rawUrls.value.length > 1);
const hasImage = computed(() => rawUrls.value.length > 0);
const activeUrl = computed(() => urls.value[selectedIndex.value] ?? null);

watch(urls, () => {
  selectedIndex.value = 0;
});

function openLightbox(index?: number) {
  if (!urls.value.length) return;
  if (index != null) selectedIndex.value = index;
  lightboxOpen.value = true;
}

function prev() {
  const n = urls.value.length;
  if (n <= 1) return;
  selectedIndex.value = (selectedIndex.value - 1 + n) % n;
}

function next() {
  const n = urls.value.length;
  if (n <= 1) return;
  selectedIndex.value = (selectedIndex.value + 1) % n;
}

function onLightboxClose(finalIndex: number) {
  lightboxOpen.value = false;
  if (Number.isFinite(finalIndex) && finalIndex >= 0 && finalIndex < urls.value.length) {
    selectedIndex.value = finalIndex;
  }
}
</script>

<template>
  <div class="mb-6 w-full md:mb-8 lg:mb-0">
    <div
      class="relative overflow-hidden rounded-md border border-zinc-200 bg-[#f3f5f9]"
    >
      <div
        class="relative flex max-h-[500px] min-h-[240px] w-full items-center justify-center"
        :class="hasImage ? 'cursor-zoom-in' : ''"
        role="button"
        :tabindex="hasImage ? 0 : -1"
        :aria-label="hasImage ? 'Şəkli tam ekranda aç' : undefined"
        @click="hasImage && openLightbox()"
        @keydown.enter.prevent="hasImage && openLightbox()"
        @keydown.space.prevent="hasImage && openLightbox()"
      >
        <CachedImage
          v-if="hasImage"
          :src="rawUrls[selectedIndex] ?? props.cover"
          :alt="alt ?? ''"
          class="max-h-[500px] w-full object-contain p-2"
          draggable="false"
        />
        <p v-else class="py-16 text-sm text-zinc-400">Şəkil yoxdur</p>

        <template v-if="hasMany && hasImage">
          <button
            type="button"
            class="gallery-nav-btn absolute left-2 top-1/2 z-10 -translate-y-1/2 md:left-3"
            aria-label="Əvvəlki şəkil"
            @click.stop="prev"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            class="gallery-nav-btn absolute right-2 top-1/2 z-10 -translate-y-1/2 md:right-3"
            aria-label="Növbəti şəkil"
            @click.stop="next"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </template>
      </div>
    </div>

    <div v-if="hasMany" class="mt-3 flex flex-wrap gap-2">
      <button
        v-for="(url, idx) in urls"
        :key="url + idx"
        type="button"
        class="h-16 w-16 overflow-hidden rounded-md border-2 transition hover:opacity-80"
        :class="
          idx === selectedIndex
            ? 'border-emerald-600 ring-1 ring-emerald-600/30'
            : 'border-zinc-200 hover:border-zinc-300'
        "
        @click="selectedIndex = idx"
        @dblclick="openLightbox(idx)"
      >
        <CachedImage :src="rawUrls[idx]" :alt="alt ?? ''" class="h-full w-full object-cover" />
      </button>
    </div>
  </div>

  <ProductLightbox
    :open="lightboxOpen"
    :urls="urls"
    :initial-index="selectedIndex"
    :alt="alt"
    @close="onLightboxClose"
  />
</template>

<style scoped>
.gallery-nav-btn {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: none;
  border-radius: 9999px;
  background: #ffffff;
  color: #18181b;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.14);
  cursor: pointer;
  line-height: 0;
  transition: background-color 0.2s ease, color 0.2s ease;
  -webkit-appearance: none;
  appearance: none;
}
@media (min-width: 768px) {
  .gallery-nav-btn {
    width: 2.5rem;
    height: 2.5rem;
  }
}
.gallery-nav-btn svg {
  display: block;
  width: 1.25rem;
  height: 1.25rem;
}
.gallery-nav-btn:hover {
  background: #0d9488;
  color: #ffffff;
}
</style>
