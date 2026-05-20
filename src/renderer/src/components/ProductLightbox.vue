<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
  urls: string[];
  initialIndex?: number;
  alt?: string;
}>();

const emit = defineEmits<{ close: [index: number] }>();

const index = ref(0);

const activeUrl = computed(() => props.urls[index.value] ?? '');
const hasMany = computed(() => props.urls.length > 1);
const counterText = computed(() => `${index.value + 1} / ${props.urls.length}`);

watch(
  () => props.open,
  (open) => {
    if (open) {
      index.value = Math.min(props.initialIndex ?? 0, Math.max(0, props.urls.length - 1));
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  },
);

watch(
  () => props.initialIndex,
  (i) => {
    if (props.open && i != null) {
      index.value = Math.min(i, Math.max(0, props.urls.length - 1));
    }
  },
);

function close() {
  emit('close', index.value);
}

function onKeydown(e: KeyboardEvent) {
  if (!props.open) return;
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowLeft') prev();
  if (e.key === 'ArrowRight') next();
}

function prev() {
  const n = props.urls.length;
  if (n <= 1) return;
  index.value = (index.value - 1 + n) % n;
}

function next() {
  const n = props.urls.length;
  if (n <= 1) return;
  index.value = (index.value + 1) % n;
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div
      v-show="open && urls.length > 0"
      class="product-lightbox-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="alt ?? 'Məhsul şəkilləri'"
      @click="close"
    >
      <button
        type="button"
        class="product-lightbox-close"
        aria-label="Bağla"
        @click.stop="close"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <div class="product-lightbox-container" @click.stop>
        <img
          v-if="activeUrl"
          :src="activeUrl"
          :alt="alt ?? ''"
          class="product-lightbox-image"
          draggable="false"
        />

        <button
          v-if="hasMany"
          type="button"
          class="product-lightbox-prev"
          aria-label="Əvvəlki şəkil"
          @click.stop="prev"
        >
          <svg
            class="product-lightbox-nav-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          v-if="hasMany"
          type="button"
          class="product-lightbox-next"
          aria-label="Növbəti şəkil"
          @click.stop="next"
        >
          <svg
            class="product-lightbox-nav-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <p v-if="hasMany" class="product-lightbox-hint">{{ counterText }}</p>
      </div>
    </div>
  </Teleport>
</template>

<style>
/* Web `product-lightbox` — global, Teleport üçün scoped deyil */
.product-lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background-color: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: product-lightbox-fade-in 0.25s ease;
}

@keyframes product-lightbox-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.product-lightbox-container {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 100vw;
  max-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 56px 64px 48px;
}

.product-lightbox-close,
.product-lightbox-prev,
.product-lightbox-next {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: grid;
  place-items: center;
  line-height: 0;
  font: inherit;
  -webkit-appearance: none;
  appearance: none;
}

.product-lightbox-close {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 100000;
  width: 44px;
  height: 44px;
}

.product-lightbox-close svg {
  display: block;
  width: 24px;
  height: 24px;
}

.product-lightbox-nav-icon {
  display: block;
  width: 22px;
  height: 22px;
}

.product-lightbox-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.product-lightbox-image {
  display: block;
  max-width: min(90vw, 1200px);
  max-height: 90vh;
  width: auto;
  height: auto;
  object-fit: contain;
  user-select: none;
}

.product-lightbox-prev,
.product-lightbox-next {
  position: fixed;
  top: 50%;
  z-index: 100000;
  width: 44px;
  height: 44px;
  transform: translateY(-50%);
  user-select: none;
}

.product-lightbox-prev {
  left: 16px;
}

.product-lightbox-next {
  right: 16px;
}

.product-lightbox-prev:hover,
.product-lightbox-next:hover {
  background: rgba(255, 255, 255, 0.3);
}

.product-lightbox-hint {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100000;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  pointer-events: none;
  user-select: none;
}
</style>
