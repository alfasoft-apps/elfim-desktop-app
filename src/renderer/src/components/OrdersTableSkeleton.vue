<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 6 });
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm" aria-busy="true">
    <div class="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
      <div class="flex gap-4">
        <div class="h-3 w-10 animate-pulse rounded bg-zinc-200" />
        <div class="h-3 w-20 animate-pulse rounded bg-zinc-200" />
        <div class="h-3 w-16 animate-pulse rounded bg-zinc-200" />
        <div class="h-3 w-14 animate-pulse rounded bg-zinc-200" />
        <div class="h-3 w-14 animate-pulse rounded bg-zinc-200" />
      </div>
    </div>
    <div class="divide-y divide-zinc-100">
      <div v-for="n in rows" :key="n" class="flex gap-4 px-4 py-4">
        <div class="h-4 w-14 animate-pulse rounded bg-zinc-100" />
        <div class="h-4 flex-1 max-w-[10rem] animate-pulse rounded bg-zinc-100" />
        <div class="h-4 w-20 animate-pulse rounded bg-zinc-100" />
        <div class="h-4 w-24 animate-pulse rounded bg-zinc-100" />
        <div class="h-4 w-28 animate-pulse rounded bg-zinc-100" />
        <div class="ml-auto h-4 w-12 animate-pulse rounded bg-zinc-100" />
      </div>
    </div>
  </div>
</template>
