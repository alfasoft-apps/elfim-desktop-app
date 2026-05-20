import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const STORAGE_KEY = 'elfim-pos-catalog-filters';

type Stored = {
  oemQuery: string;
  selectedCategoryId: number | null;
  selectedShopId: number | null;
  searchPage: number;
};

function loadStored(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('empty');
    const p = JSON.parse(raw) as Partial<Stored>;
    return {
      oemQuery: typeof p.oemQuery === 'string' ? p.oemQuery : '',
      selectedCategoryId:
        typeof p.selectedCategoryId === 'number' && Number.isFinite(p.selectedCategoryId)
          ? p.selectedCategoryId
          : null,
      selectedShopId:
        typeof p.selectedShopId === 'number' && Number.isFinite(p.selectedShopId)
          ? p.selectedShopId
          : null,
      searchPage:
        typeof p.searchPage === 'number' && Number.isFinite(p.searchPage) && p.searchPage > 0
          ? Math.floor(p.searchPage)
          : 1,
    };
  } catch {
    return {
      oemQuery: '',
      selectedCategoryId: null,
      selectedShopId: null,
      searchPage: 1,
    };
  }
}

/** POS məhsul siyahısı üçün OEM, kateqoriya, mağaza və səhifə — yerli disklə saxlanılır. */
export const usePosCatalogFiltersStore = defineStore('posCatalogFilters', () => {
  const initial = loadStored();
  const oemQuery = ref(initial.oemQuery);
  const selectedCategoryId = ref<number | null>(initial.selectedCategoryId);
  const selectedShopId = ref<number | null>(initial.selectedShopId);
  const searchPage = ref(initial.searchPage);

  function persist() {
    try {
      const payload: Stored = {
        oemQuery: oemQuery.value,
        selectedCategoryId: selectedCategoryId.value,
        selectedShopId: selectedShopId.value,
        searchPage: searchPage.value,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota / private mode */
    }
  }

  watch([oemQuery, selectedCategoryId, selectedShopId, searchPage], persist);

  return {
    oemQuery,
    selectedCategoryId,
    selectedShopId,
    searchPage,
    persist,
  };
});
