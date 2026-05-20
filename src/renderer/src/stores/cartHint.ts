import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useCartHintStore = defineStore('cartHint', () => {
  const totalItems = ref(0);

  function setCount(n: number) {
    totalItems.value = n;
  }

  return { totalItems, setCount };
});
