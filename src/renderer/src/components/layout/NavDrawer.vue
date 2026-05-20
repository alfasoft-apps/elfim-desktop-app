<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { fetchCategories, logout } from '../../api/elfim-api';
import type { CategoryItem } from '../../api/types';
import { NAV_SECTIONS, type NavSection } from '../../config/navigation';
import { ROUTES } from '../../constants/routes';
import { useSessionAuthStore } from '../../stores/sessionAuth';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const router = useRouter();
const sessionAuth = useSessionAuthStore();
const { isAuthenticated } = storeToRefs(sessionAuth);

/** Giriş vəziyyətinə uyğun boş bölmələri və əlavələri çıxarır. */
const visibleNavSections = computed((): NavSection[] => {
  const auth = isAuthenticated.value;
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.guestOnly && auth) return false;
      if (item.authOnly && !auth) return false;
      return true;
    }),
  })).filter((s) => s.items.length > 0);
});

const logoUrl = `${import.meta.env.BASE_URL}data/long-logo.png`;

const categoriesOpen = ref(false);
const categories = ref<CategoryItem[]>([]);
const categoriesLoading = ref(false);

watch(
  () => props.open,
  async (v) => {
    if (!v || categories.value.length > 0) return;
    categoriesLoading.value = true;
    try {
      categories.value = await fetchCategories();
    } catch {
      categories.value = [];
    } finally {
      categoriesLoading.value = false;
    }
  },
);

function close() {
  emit('update:open', false);
}

function openSpecialOffersStories() {
  window.dispatchEvent(new CustomEvent('show-banners'));
  close();
}

function onBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).dataset.backdrop === '1') close();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
}

watch(
  () => props.open,
  (v) => {
    document.body.style.overflow = v ? 'hidden' : '';
  },
);

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});

async function onLogout() {
  try {
    await logout();
  } finally {
    sessionAuth.refresh();
    close();
    await router.push(ROUTES.HOME);
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex bg-black/40"
        data-backdrop="1"
        @click="onBackdropClick"
      >
        <Transition name="slide-left">
          <aside
            v-if="open"
            class="relative flex h-full w-[min(100%,20rem)] flex-col bg-white shadow-xl"
            @click.stop
          >
            <div class="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <img
                :src="logoUrl"
                alt="Elfim Auto"
                class="h-9 max-h-10 w-auto max-w-[min(100%,11rem)] object-contain object-left"
                @error="($event.target as HTMLImageElement).style.display='none'"
              />
              <button
                type="button"
                class="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
                aria-label="Bağla"
                @click="close"
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav class="flex-1 overflow-y-auto px-2 py-4">
              <div class="mb-5 rounded-xl border border-zinc-100 bg-zinc-50/80 pb-3 pt-2">
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[15px] font-medium text-zinc-900 hover:bg-zinc-50"
                  @click="categoriesOpen = !categoriesOpen"
                >
                  Kateqoriyalar
                  <svg
                    class="h-5 w-5 text-zinc-500 transition"
                    :class="categoriesOpen ? 'rotate-180' : ''"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div v-show="categoriesOpen" class="mt-1 space-y-1 pl-1">
                  <p v-if="categoriesLoading" class="px-3 py-2 text-sm text-zinc-500">Yüklənir…</p>
                  <RouterLink
                    v-for="cat in categories"
                    :key="cat.id"
                    :to="ROUTES.HOME"
                    class="block rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                    @click="close"
                  >
                    {{ cat.name }}
                  </RouterLink>
                </div>
              </div>

              <div v-for="section in visibleNavSections" :key="section.heading" class="mb-5">
                <div
                  class="mx-1 mb-1.5 flex items-center gap-2 px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-teal-800/90"
                >
                  <span class="h-px flex-1 bg-gradient-to-r from-teal-200/80 to-transparent" aria-hidden="true" />
                  <span>{{ section.heading }}</span>
                  <span class="h-px flex-1 bg-gradient-to-l from-teal-200/80 to-transparent" aria-hidden="true" />
                </div>
                <div class="space-y-0.5 rounded-xl border border-zinc-100/90 bg-white p-1 shadow-sm shadow-zinc-900/[0.03]">
                  <template v-for="item in section.items" :key="item.label + item.to">
                    <button
                      v-if="item.to === ROUTES.SPECIAL_OFFERS"
                      type="button"
                      class="block w-full rounded-lg px-3 py-2.5 text-left text-[15px] text-zinc-800 transition hover:bg-teal-50/70"
                      @click="openSpecialOffersStories"
                    >
                      {{ item.label }}
                    </button>
                    <RouterLink
                      v-else
                      :to="item.to"
                      class="block rounded-lg px-3 py-2.5 text-[15px] text-zinc-800 transition hover:bg-teal-50/70"
                      active-class="bg-teal-50 font-semibold text-teal-900 ring-1 ring-teal-200/60"
                      @click="close"
                    >
                      {{ item.label }}
                    </RouterLink>
                  </template>
                </div>
              </div>
            </nav>

            <div class="border-t border-zinc-200 px-4 py-3">
              <button
                v-if="isAuthenticated"
                type="button"
                class="w-full rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                @click="onLogout"
              >
                Çıxış
              </button>
              <div class="mt-4 flex justify-center gap-5 text-zinc-500">
                <a href="#" class="hover:text-emerald-600" aria-label="Facebook" @click.prevent>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" class="hover:text-emerald-600" aria-label="YouTube" @click.prevent>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a href="#" class="hover:text-emerald-600" aria-label="Instagram" @click.prevent>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
            </div>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.25s ease;
}
.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>
