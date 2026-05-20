import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

const TOKEN_KEY = 'auth_token';

function tokenValid(): boolean {
  const t = localStorage.getItem(TOKEN_KEY);
  if (!t) return false;
  try {
    const payload = JSON.parse(atob(t.split('.')[1])) as { exp?: number };
    if (payload.exp !== undefined && payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export const useSessionAuthStore = defineStore('sessionAuth', () => {
  const revision = ref(0);
  const isAuthenticated = computed(() => {
    revision.value;
    return tokenValid();
  });

  function refresh() {
    revision.value++;
  }

  return { isAuthenticated, refresh };
});
