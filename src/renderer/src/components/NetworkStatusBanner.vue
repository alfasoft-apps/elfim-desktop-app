<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAppDataCacheStore } from '../stores/appDataCache';
import { useNetworkStatusStore } from '../stores/networkStatus';

const network = useNetworkStatusStore();
const appCache = useAppDataCacheStore();
const { isOnline, showBackOnline } = storeToRefs(network);
const {
  servingOffline,
  hasCache,
  syncing,
  displayProductCount,
  lastFetchSource,
  bundleProductCountMismatch,
} = storeToRefs(appCache);

const offlineDetail = computed(() => {
  const n = displayProductCount.value;
  if (n > 0) return ` — keşdən · ${n} məhsul`;
  return ' — keşdən oxunulur (3 saat)';
});

const liveDetail = computed(() => {
  const n = displayProductCount.value;
  if (lastFetchSource.value === 'network' && n > 0) return ` · ${n} məhsul keşdə`;
  return '';
});
</script>

<template>
  <Teleport to="body">
    <Transition name="network-offline">
      <div
        v-if="!isOnline"
        class="network-banner network-banner--offline"
        role="status"
        aria-live="assertive"
      >
        <svg
          class="network-banner__icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 20h.01" />
          <path d="M8.5 16.429a5 5 0 0 1 7 0" />
          <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
          <path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
          <path d="M2 8.82a15 15 0 0 1 4.177-2.643" />
          <path d="M22 8.82a15 15 0 0 0-11.288-3.764" />
          <path d="m2 2 20 20" />
        </svg>
        <span class="network-banner__text">
          İnternet bağlantısı yoxdur
          <template v-if="hasCache">{{ offlineDetail }}</template>
        </span>
      </div>
    </Transition>

    <Transition name="network-offline">
      <div
        v-if="isOnline && servingOffline && hasCache"
        class="network-banner network-banner--cache"
        role="status"
      >
        <span class="network-banner__text">
          Canlı + keş rejimi — serverdən götürülür, göstərilən məzmun keşlənir{{ liveDetail }}
        </span>
      </div>
    </Transition>

    <Transition name="network-offline">
      <div
        v-if="isOnline && bundleProductCountMismatch"
        class="network-banner network-banner--warn"
        role="status"
      >
        <span class="network-banner__text">
          Diqqət: serverdə məhsul sayı ilə paket uyğun gəlmir — keşi yeniləyin (Parametrlər / yenidən açın).
        </span>
      </div>
    </Transition>

    <Transition name="network-online">
      <div
        v-if="showBackOnline && isOnline"
        class="network-banner network-banner--online"
        role="status"
        aria-live="polite"
      >
        <svg
          class="network-banner__icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 20h.01" />
          <path d="M8.5 16.429a5 5 0 0 1 7 0" />
          <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
          <path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
          <path d="M2 8.82a15 15 0 0 1 4.177-2.643" />
          <path d="M22 8.82a15 15 0 0 0-11.288-3.764" />
        </svg>
        <span class="network-banner__text">Hal-hazırda onlaynsınız</span>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.network-banner {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25rem;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.12);
}

/* Bottom nav + keş progress bar */
.network-banner--offline {
  bottom: v-bind("syncing ? '6.75rem' : '4.5rem'");
  background: #18181b;
  color: #fafafa;
}

.network-banner--online {
  bottom: v-bind("syncing ? '6.75rem' : '4.5rem'");
  background: #166534;
  color: #f0fdf4;
}

.network-banner--cache {
  bottom: v-bind("syncing ? '6.75rem' : '4.5rem'");
  background: #1e3a5f;
  color: #e0f2fe;
}

.network-banner--warn {
  bottom: v-bind("syncing ? '10rem' : '7.75rem'");
  background: #78350f;
  color: #fffbeb;
  font-size: 0.8125rem;
}

.network-banner__icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.network-offline-enter-active,
.network-offline-leave-active,
.network-online-enter-active,
.network-online-leave-active {
  transition:
    transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.network-offline-enter-from,
.network-offline-leave-to,
.network-online-enter-from,
.network-online-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
