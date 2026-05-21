import { onMounted, onUnmounted, ref } from 'vue';
import type { AutoUpdateStatus } from '../types/auto-update-status';

/** Main prosesdən gələn yeniləmə statusu — bütün quraşdırılmış tətbiqdə dinlənir (yalnız Settings deyil). */
export function useAutoUpdateStatus() {
  const updateSupported = ref(false);
  const updatePhase = ref<AutoUpdateStatus | null>(null);
  let removeListener: (() => void) | undefined;

  onMounted(async () => {
    try {
      if (typeof window.elfim?.isAutoUpdateSupported === 'function') {
        updateSupported.value = await window.elfim.isAutoUpdateSupported();
      }
      if (updateSupported.value && typeof window.elfim?.onUpdateStatus === 'function') {
        removeListener = window.elfim.onUpdateStatus((s) => {
          updatePhase.value = s;
        });
      }
    } catch {
      updateSupported.value = false;
    }
  });

  onUnmounted(() => {
    removeListener?.();
  });

  async function checkForUpdates(): Promise<void> {
    if (typeof window.elfim?.checkForUpdates === 'function') {
      await window.elfim.checkForUpdates();
    }
  }

  async function quitAndInstall(): Promise<void> {
    if (typeof window.elfim?.quitAndInstallUpdate === 'function') {
      await window.elfim.quitAndInstallUpdate();
    }
  }

  return { updateSupported, updatePhase, checkForUpdates, quitAndInstall };
}
