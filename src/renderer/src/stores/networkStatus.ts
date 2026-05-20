import { defineStore } from 'pinia';
import { ref } from 'vue';

const POLL_ONLINE_MS = 15_000;
const POLL_OFFLINE_MS = 4_000;
const BACK_ONLINE_TOAST_MS = 4_000;

async function probeInternet(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  if (typeof window !== 'undefined' && typeof window.elfim?.checkInternetConnectivity === 'function') {
    return window.elfim.checkInternetConnectivity();
  }
  return navigator.onLine;
}

export const useNetworkStatusStore = defineStore('networkStatus', () => {
  const isOnline = ref(true);
  const showBackOnline = ref(false);
  const isMonitoring = ref(false);

  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let backOnlineTimer: ReturnType<typeof setTimeout> | null = null;
  let probeInFlight = false;

  function clearBackOnlineToast() {
    if (backOnlineTimer) {
      clearTimeout(backOnlineTimer);
      backOnlineTimer = null;
    }
    showBackOnline.value = false;
  }

  function applyOffline() {
    if (!isOnline.value) return;
    isOnline.value = false;
    clearBackOnlineToast();
    schedulePoll();
  }

  function applyOnline() {
    const wasOffline = !isOnline.value;
    isOnline.value = true;
    if (wasOffline) {
      showBackOnline.value = true;
      if (backOnlineTimer) clearTimeout(backOnlineTimer);
      backOnlineTimer = setTimeout(() => {
        showBackOnline.value = false;
        backOnlineTimer = null;
      }, BACK_ONLINE_TOAST_MS);
      schedulePoll();
    }
  }

  async function runProbe() {
    if (probeInFlight) return;
    probeInFlight = true;
    try {
      const online = await probeInternet();
      if (online) applyOnline();
      else applyOffline();
    } finally {
      probeInFlight = false;
    }
  }

  function schedulePoll() {
    if (!isMonitoring.value) return;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    const ms = isOnline.value ? POLL_ONLINE_MS : POLL_OFFLINE_MS;
    pollTimer = setInterval(() => void runProbe(), ms);
  }

  function onBrowserOffline() {
    applyOffline();
    schedulePoll();
  }

  function onBrowserOnline() {
    void runProbe();
  }

  function startMonitoring() {
    if (isMonitoring.value) return;
    isMonitoring.value = true;

    window.addEventListener('offline', onBrowserOffline);
    window.addEventListener('online', onBrowserOnline);

    void runProbe();
    schedulePoll();
  }

  function stopMonitoring() {
    isMonitoring.value = false;
    window.removeEventListener('offline', onBrowserOffline);
    window.removeEventListener('online', onBrowserOnline);
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    clearBackOnlineToast();
  }

  return {
    isOnline,
    showBackOnline,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    runProbe,
  };
});
