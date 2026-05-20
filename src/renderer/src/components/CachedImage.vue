<script setup lang="ts">
import { computed } from 'vue';
import { useCachedImageUrl } from '../composables/useCachedImageUrl';
import { resolveImageUrl } from '../utils/image-url';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  src?: string | null;
  alt?: string;
}>();

const remoteUrl = computed(() => resolveImageUrl(props.src ?? undefined));
const displaySrc = useCachedImageUrl(() => props.src ?? undefined);

function onError(): void {
  const current = displaySrc.value ?? '';
  const remote = remoteUrl.value;
  // Keş URL uğursuz olsa uzaq CDN-ə keç (onlayn); oflaynda boş saxlama.
  if (remote && current !== remote && !current.startsWith('elfim-cache:')) {
    displaySrc.value = remote;
    return;
  }
  if (remote && current.startsWith('elfim-cache:')) {
    displaySrc.value = remote;
    return;
  }
  displaySrc.value = undefined;
}
</script>

<template>
  <img
    v-if="displaySrc"
    :src="displaySrc"
    :alt="alt ?? ''"
    v-bind="$attrs"
    decoding="async"
    @error="onError"
  />
</template>
