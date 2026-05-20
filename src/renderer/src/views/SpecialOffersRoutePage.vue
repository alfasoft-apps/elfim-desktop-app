<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ROUTES } from '../constants/routes';

const router = useRouter();

/** Yalnız dərin keçid (#/special-offers): story açılır, ayrıca səhifə göstərilmir. */
onMounted(() => {
  window.dispatchEvent(new CustomEvent('show-banners'));
  void router.replace(ROUTES.HOME);
});
</script>

<template />
