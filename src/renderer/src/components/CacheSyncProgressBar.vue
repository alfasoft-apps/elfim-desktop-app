<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAppDataCacheStore } from '../stores/appDataCache';

const cache = useAppDataCacheStore();
const { syncing, syncProgress, syncLabel, lastSyncError } = storeToRefs(cache);
</script>

<template>
  <div class="cache-sync-stack">
    <Transition name="cache-sync">
      <div
        v-if="syncing"
        class="cache-sync__strip"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="cache-sync__row">
          <span class="cache-sync__title">Məlumatlar keşlənir</span>
          <span class="cache-sync__pct">{{ syncProgress }}%</span>
        </div>
        <p class="cache-sync__label">{{ syncLabel || 'Hazırlanır…' }}</p>
        <div class="cache-sync__track" aria-hidden="true">
          <div class="cache-sync__fill" :style="{ width: `${syncProgress}%` }" />
        </div>
      </div>
    </Transition>

    <p v-if="!syncing && lastSyncError" class="cache-sync-error" role="alert">
      Keş xətası: {{ lastSyncError }}
    </p>
  </div>
</template>

<style scoped>
/** Alt panel ilə eyni `fixed` sütunda — tam en, ara boşluqsuz */
.cache-sync-stack {
  width: 100%;
  flex-shrink: 0;
}

.cache-sync__strip {
  width: 100%;
  padding: 0.45rem 1rem 0.5rem;
  background: linear-gradient(to top, #0f172a, #1e293b);
  color: #f8fafc;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.cache-sync__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.15rem;
}

.cache-sync__title {
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.cache-sync__pct {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: #94a3b8;
}

.cache-sync__label {
  margin: 0 0 0.35rem;
  font-size: 0.6875rem;
  color: #cbd5e1;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.cache-sync__track {
  height: 4px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.cache-sync__fill {
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(90deg, #10b981, #34d399);
  transition: width 0.35s ease;
}

.cache-sync-error {
  width: 100%;
  margin: 0;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  background: #fef2f2;
  color: #991b1b;
  border-top: 1px solid #fecaca;
}

.cache-sync-enter-active,
.cache-sync-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.cache-sync-enter-from,
.cache-sync-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
