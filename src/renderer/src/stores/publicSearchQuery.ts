import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const STORAGE_KEY = 'elfim-public-search-query';

/** Ayrıca «Axtarış» səhifəsində OEM sahəsi — tətbiq bağlanandan sonra da saxlanılır. */
export const usePublicSearchQueryStore = defineStore('publicSearchQuery', () => {
  const oemQuery = ref('');

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { oemQuery?: unknown };
      if (typeof p.oemQuery === 'string') oemQuery.value = p.oemQuery;
    }
  } catch {
    /* ignore */
  }

  watch(oemQuery, () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ oemQuery: oemQuery.value }));
    } catch {
      /* ignore */
    }
  });

  return { oemQuery };
});
