import { storeToRefs } from 'pinia';
import { useShoppingCartStore } from '../stores/shoppingCart';

/** Pinia + localStorage ilə ümumi səbət vəziyyəti; komponentlər üçün köhnə API saxlanılır. */
export function useShoppingCart() {
  const store = useShoppingCartStore();
  const refs = storeToRefs(store);
  return {
    ...refs,
    hydrateFromStorage: store.hydrateFromStorage,
    reload: store.reload,
    addProduct: store.addProduct,
    deltaLineQuantity: store.deltaLineQuantity,
    setProductQuantity: store.setProductQuantity,
    removeLine: store.removeLine,
    clearAll: store.clearAll,
    quantityForProduct: store.quantityForProduct,
  };
}
