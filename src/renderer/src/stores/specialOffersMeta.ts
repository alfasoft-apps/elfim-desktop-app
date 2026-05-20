import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchBanners } from '../api/elfim-api';
import type { BannersFetchResult } from '../api/types';

const TTL_MS = 5 * 60 * 1000;

/** Mobil/desktop alt panel “Yeni” nişanı üçün banner meta (API ilə sinxrondur). */
export const useSpecialOffersMetaStore = defineStore('specialOffersMeta', () => {
  const hasNewToday = ref(false);
  const bannerCount = ref(0);
  let lastFetchAt = 0;

  const showNewBadge = computed(() => hasNewToday.value && bannerCount.value > 0);

  async function refresh(force = false): Promise<void> {
    if (!force && Date.now() - lastFetchAt < TTL_MS) {
      return;
    }
    try {
      const r = await fetchBanners();
      hydrateFromResult(r);
    } catch {
      /* offline / xəta — mövcud dəyərləri saxla */
    }
  }

  function hydrateFromResult(r: BannersFetchResult): void {
    lastFetchAt = Date.now();
    bannerCount.value = r.banners.length;
    hasNewToday.value = r.meta.has_new_special_offer_today === true;
  }

  return {
    hasNewToday,
    bannerCount,
    showNewBadge,
    refresh,
    hydrateFromResult,
  };
});
