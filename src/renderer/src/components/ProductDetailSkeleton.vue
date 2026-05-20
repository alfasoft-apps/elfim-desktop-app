<template>
  <div class="mx-auto max-w-[1400px] animate-pulse pb-8" aria-busy="true" aria-label="Yüklənir">
    <div class="mb-4 h-4 w-40 rounded bg-zinc-200" />
    <div class="grid grid-cols-1 gap-7 lg:grid-cols-10 2xl:gap-8">
      <div class="aspect-square max-h-[28rem] rounded-xl bg-zinc-200 lg:col-span-6 lg:max-h-none" />
      <div class="flex flex-col lg:col-span-4 lg:pl-2">
        <div class="h-8 w-full max-w-md rounded-lg bg-zinc-200" />
        <div class="mt-6 h-10 w-36 rounded-lg bg-zinc-200" />
        <div class="mt-8 h-12 w-full rounded-lg bg-zinc-100" />
        <div class="mt-4 h-14 w-full rounded-lg bg-zinc-300/80" />
      </div>
    </div>
    <div class="mt-14 border-b border-zinc-200 pb-3">
      <div class="h-5 w-48 rounded bg-zinc-200" />
    </div>
    <div class="mt-8 space-y-3">
      <div class="h-24 w-full rounded-xl bg-zinc-100" />
      <div class="h-40 w-full rounded-xl bg-zinc-100" />
    </div>
  </div>
</template>
