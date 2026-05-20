<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ROUTES } from '../constants/routes';
</script>

<template>
  <div class="mx-auto max-w-lg text-center">
    <p class="text-6xl font-bold text-zinc-200">404</p>
    <h1 class="mt-4 text-xl font-semibold text-zinc-900">Səhifə tapılmadı</h1>
    <p class="mt-2 text-sm text-zinc-600">Ünvan mövcud deyil və ya köçürülüb.</p>
    <RouterLink
      :to="ROUTES.HOME"
      class="mt-6 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
    >
      Əsas səhifəyə qayıt
    </RouterLink>
  </div>
</template>
