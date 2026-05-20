import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { CartPayload, ProductListItem } from '../api/types';
import {
  addItemWithQuantity,
  applyCartItems,
  emptyCartState,
  getItem,
  removeItem,
  removeItemOrQuantity,
  updateItemWithQuantity,
  type CartItem,
  type CartState,
} from '../utils/cart.utils';
import { generateCartItemFromProduct, productIdFromLine } from '../utils/generate-cart-item';
import { useCartHintStore } from './cartHint';

/** Web ilə eyni açar: `elfim-cart` */
const STORAGE_KEY = 'elfim-cart';

function loadPersisted(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCartState();
    const parsed = JSON.parse(raw) as CartState;
    if (!parsed || !Array.isArray(parsed.items)) return emptyCartState();
    return applyCartItems(
      parsed.items.map((item) => ({
        ...item,
        id: Number(item.id),
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 0,
      })),
    );
  } catch {
    return emptyCartState();
  }
}

function savePersisted(state: CartState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

function stateToPayload(state: CartState): CartPayload {
  return {
    items: state.items.map((item) => ({
      id: Number(item.id),
      name: item.name ?? null,
      slug: item.slug ?? null,
      image: typeof item.image === 'string' ? item.image : null,
      price: item.price,
      quantity: item.quantity ?? 0,
    })),
    isEmpty: state.isEmpty,
    totalItems: state.totalItems,
    total: state.total,
  };
}

export const useShoppingCartStore = defineStore('shoppingCart', () => {
  const cartState = ref<CartState>(loadPersisted());
  const loading = ref(false);
  const error = ref<string | null>(null);
  const hint = useCartHintStore();

  const payload = computed(() => stateToPayload(cartState.value));

  function commit(state: CartState) {
    cartState.value = state;
    hint.setCount(state.totalItems);
    savePersisted(state);
  }

  function hydrateFromStorage() {
    error.value = null;
    loading.value = false;
    commit(loadPersisted());
  }

  function reload() {
    hydrateFromStorage();
    return Promise.resolve();
  }

  function lineForProduct(productId: number): CartItem | undefined {
    return getItem(cartState.value.items, productId);
  }

  function addProduct(product: ProductListItem, quantity = 1) {
    error.value = null;
    const item = generateCartItemFromProduct(product);
    const next = addItemWithQuantity(cartState.value.items, item, quantity);
    commit(applyCartItems(next));
  }

  function deltaLineQuantity(line: Record<string, unknown>, delta: number) {
    error.value = null;
    const pid = productIdFromLine(line);
    if (pid == null) throw new Error('Məhsul ID tapılmadı.');
    const existing = lineForProduct(pid);
    if (!existing) throw new Error('Məhsul səbətdə tapılmadı.');
    if (delta > 0) {
      commit(applyCartItems(addItemWithQuantity(cartState.value.items, existing, delta)));
    } else {
      commit(applyCartItems(removeItemOrQuantity(cartState.value.items, pid, -delta)));
    }
  }

  function setProductQuantity(productId: number, targetQty: number) {
    error.value = null;
    const MAX = 999_999;
    const q = Math.min(MAX, Math.max(0, Math.floor(Number(targetQty))));
    const existing = lineForProduct(productId);
    if (q <= 0) {
      commit(applyCartItems(removeItem(cartState.value.items, productId)));
      return;
    }
    if (!existing) {
      throw new Error('Məhsul səbətdə tapılmadı.');
    }
    commit(applyCartItems(updateItemWithQuantity(cartState.value.items, existing, q)));
  }

  function removeLine(cartLineId: number) {
    error.value = null;
    commit(applyCartItems(removeItem(cartState.value.items, cartLineId)));
  }

  function clearAll() {
    error.value = null;
    commit(emptyCartState());
  }

  function quantityForProduct(productId: number): number {
    const line = lineForProduct(productId);
    return line ? Number(line.quantity ?? 0) : 0;
  }

  return {
    cartState,
    payload,
    loading,
    error,
    hydrateFromStorage,
    reload,
    addProduct,
    deltaLineQuantity,
    setProductQuantity,
    removeLine,
    clearAll,
    quantityForProduct,
  };
});
