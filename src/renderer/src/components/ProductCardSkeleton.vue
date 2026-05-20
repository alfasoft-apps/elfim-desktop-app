<script setup lang="ts">
withDefaults(
  defineProps<{
    /** POS kartı üçün kölgə; kataloq üçün üzük. */
    variant?: 'catalog' | 'pos';
  }>(),
  { variant: 'catalog' },
);
</script>

<template>
  <div
    class="relative flex h-[296px] w-full min-w-0 flex-col overflow-hidden rounded-xl bg-white"
    :class="
      variant === 'pos'
        ? 'shadow-[0_4px_18px_rgba(15,23,42,0.1)]'
        : 'shadow-md ring-1 ring-zinc-100'
    "
    aria-hidden="true"
  >
    <div class="h-[148px] shrink-0 animate-pulse rounded-t-xl bg-zinc-200/75" />
    <div class="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
      <div class="h-6 w-24 animate-pulse rounded-md bg-zinc-200/70" />
      <div class="mt-3 h-4 w-full animate-pulse rounded-md bg-zinc-100" />
      <div class="mt-2 h-4 w-5/6 animate-pulse rounded-md bg-zinc-100" />
      <div class="mt-auto pt-2">
        <div class="h-3 w-16 animate-pulse rounded bg-zinc-100" />
      </div>
    </div>
  </div>
</template>
