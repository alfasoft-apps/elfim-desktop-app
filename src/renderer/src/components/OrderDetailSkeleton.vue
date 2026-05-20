<template>
  <div class="mx-auto max-w-3xl animate-pulse space-y-6" aria-busy="true">
    <section class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div class="h-3 w-24 rounded bg-zinc-200" />
      <div class="mt-4 h-8 w-48 rounded-lg bg-zinc-200" />
      <div class="mt-4 h-4 w-full max-w-xs rounded bg-zinc-100" />
      <div class="mt-2 h-4 w-40 rounded bg-zinc-100" />
      <div class="mt-6 h-16 w-full rounded-lg bg-zinc-100" />
    </section>
    <section class="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div class="space-y-3">
        <div v-for="n in 4" :key="n" class="flex gap-4 py-2">
          <div class="h-4 flex-1 rounded bg-zinc-100" />
          <div class="h-4 w-12 rounded bg-zinc-100" />
          <div class="h-4 w-20 rounded bg-zinc-100" />
          <div class="h-4 w-20 rounded bg-zinc-100" />
        </div>
      </div>
    </section>
  </div>
</template>
