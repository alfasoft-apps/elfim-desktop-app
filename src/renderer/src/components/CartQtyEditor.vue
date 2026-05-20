<script setup lang="ts">
/**
 * Səbət sətirləri və POS kartları üçün ortada redaktə olunan miqdar (+/-).
 */
import { computed, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    quantity: number;
    disabled?: boolean;
    /** Səbət çəkicisi üçün daha sıq ölçü */
    compact?: boolean;
    /** Stok bitəndə + və miqdarın artırılmasını bloklayır (azaltma işləyir). */
    incrementDisabled?: boolean;
  }>(),
  { disabled: false, compact: false, incrementDisabled: false },
);

const emit = defineEmits<{
  increment: [];
  decrement: [];
  /** Mütləq miqdar (blur, Enter, debounce). */
  setQuantity: [qty: number];
}>();

const qtyInput = ref('');
const qtyFocused = ref(false);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Son göndərilmiş hədəf miqdar — server `quantity` yenilənənə qədər köhnə qalır; blur təkrar eyni POST etməsin. */
const pendingEmittedQty = ref<number | null>(null);

const DEBOUNCE_MS = 550;

function syncInputFromProp() {
  if (!qtyFocused.value) {
    const q = Number(props.quantity);
    const n = Number.isFinite(q) ? q : 0;
    qtyInput.value = n > 0 ? String(n) : '';
  }
}

watch(
  () => props.quantity,
  (q) => {
    const n = Number(q);
    if (pendingEmittedQty.value !== null && Number.isFinite(n) && n === pendingEmittedQty.value) {
      pendingEmittedQty.value = null;
    }
    syncInputFromProp();
  },
  { immediate: true },
);

function clearDebounce() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

function parseQty(s: string): number | null {
  const d = s.replace(/\D/g, '');
  if (d === '') return null;
  const n = parseInt(d, 10);
  return Number.isFinite(n) ? n : null;
}

function commitQty() {
  const parsed = parseQty(qtyInput.value);
  const prevRaw = Number(props.quantity);
  const prev = Number.isFinite(prevRaw) ? prevRaw : 0;
  if (parsed === null) {
    qtyInput.value = prev > 0 ? String(prev) : '';
    return;
  }
  let capped = Math.min(999_999, Math.max(0, parsed));
  if (props.incrementDisabled && capped > prev) {
    capped = prev;
    qtyInput.value = String(capped);
    return;
  }
  qtyInput.value = String(capped);

  if (pendingEmittedQty.value !== null && capped === pendingEmittedQty.value) {
    return;
  }

  if (capped !== prev) {
    pendingEmittedQty.value = capped;
    emit('setQuantity', capped);
  }
}

function onQtyFocus() {
  qtyFocused.value = true;
}

function onQtyBlur() {
  qtyFocused.value = false;
  clearDebounce();
  commitQty();
}

function onQtyInput() {
  clearDebounce();
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    commitQty();
  }, DEBOUNCE_MS);
}

function onQtyKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    clearDebounce();
    commitQty();
  }
}

function onInc() {
  if (props.incrementDisabled) return;
  clearDebounce();
  pendingEmittedQty.value = null;
  emit('increment');
}

function onDec() {
  clearDebounce();
  pendingEmittedQty.value = null;
  emit('decrement');
}

/** `w-full` çubuğu sıradakı bütün enə uzadırdı; məzmun qədər en — kompakt +/- düymələri. */
const wrapClass = computed(() =>
  props.compact
    ? 'inline-flex h-9 w-max max-w-full min-w-0 items-center gap-0.5 rounded-full bg-white py-0.5 pl-0.5 pr-0.5 shadow-[0_4px_14px_rgba(15,23,42,0.14)]'
    : 'inline-flex h-10 w-max max-w-full min-w-0 items-center gap-1 rounded-full bg-white py-0.5 pl-1 pr-1 shadow-[0_4px_14px_rgba(15,23,42,0.14)]',
);

const btnClass = computed(() =>
  props.compact
    ? 'touch-manipulation grid h-7 w-7 shrink-0 place-items-center rounded-full bg-transparent p-0 text-base font-medium tabular-nums leading-none text-teal-700 transition hover:bg-black/10 disabled:opacity-40'
    : 'touch-manipulation grid h-8 w-8 shrink-0 place-items-center rounded-full bg-transparent p-0 text-lg font-medium tabular-nums leading-none text-teal-700 transition hover:bg-black/10 disabled:opacity-40',
);

const inputClass = computed(() =>
  props.compact
    ? 'min-w-[1.75rem] max-w-[5rem] shrink-0 grow-0 rounded-md bg-white px-0.5 text-center text-sm font-bold tabular-nums text-zinc-900 outline-none ring-0 placeholder:text-zinc-400'
    : 'min-w-[2rem] max-w-[5.5rem] shrink-0 grow-0 rounded-md bg-white px-1 text-center text-base font-bold tabular-nums text-zinc-900 outline-none ring-0 placeholder:text-zinc-400',
);
</script>

<template>
  <div @click.stop>
    <div :class="wrapClass">
      <button
        type="button"
        :class="btnClass"
        :disabled="disabled"
        aria-label="Azalt"
        @click="onDec"
      >
        <span
          class="pointer-events-none inline-flex min-h-[1.25em] min-w-[1.25em] select-none items-center justify-center leading-none"
          >−</span>
      </button>
      <input
        v-model="qtyInput"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        aria-label="Miqdar"
        :class="inputClass"
        @focus="onQtyFocus"
        @blur="onQtyBlur"
        @input="onQtyInput"
        @keydown="onQtyKeydown"
      />
      <button
        type="button"
        :class="btnClass"
        :disabled="disabled || incrementDisabled"
        aria-label="Artır"
        @click="onInc"
      >
        <span
          class="pointer-events-none inline-flex min-h-[1.25em] min-w-[1.25em] select-none items-center justify-center leading-none"
          >+</span>
      </button>
    </div>
  </div>
</template>
