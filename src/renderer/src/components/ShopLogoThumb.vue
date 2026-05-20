<script setup lang="ts">
import CachedImage from './CachedImage.vue';

defineProps<{
  src?: string | null;
  alt: string;
}>();
</script>

<template>
  <div
    class="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-50 ring-1 ring-zinc-200/80"
  >
    <CachedImage
      v-if="src"
      :src="src"
      :alt="alt"
      width="80"
      height="80"
      class="max-h-full max-w-full object-contain object-center p-2"
      loading="lazy"
      decoding="async"
      fetchpriority="low"
    />
  </div>
</template>
