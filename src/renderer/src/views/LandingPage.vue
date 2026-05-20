<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { watch } from 'vue';
import { useSessionAuthStore } from '../stores/sessionAuth';
import HomePage from './HomePage.vue';
import PosWorkspacePage from './PosWorkspacePage.vue';

const auth = useSessionAuthStore();
const { isAuthenticated } = storeToRefs(auth);

watch(
  isAuthenticated,
  (ok) => {
    document.title = ok ? `POS · Elfim Auto` : `Əsas səhifə · Elfim Auto`;
  },
  { immediate: true },
);
</script>

<template>
  <PosWorkspacePage v-if="isAuthenticated" />
  <HomePage v-else />
</template>
