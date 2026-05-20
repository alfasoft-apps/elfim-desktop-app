<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: number;
    disabled?: boolean;
    min?: number;
  }>(),
  { disabled: false, min: 1 },
);

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const inputValue = ref(String(props.modelValue));

watch(
  () => props.modelValue,
  (v) => {
    inputValue.value = String(v);
  },
);

function clamp(n: number): number {
  return Math.min(999_999, Math.max(props.min, n));
}

function commitFromInput() {
  const parsed = parseInt(inputValue.value.replace(/\D/g, ''), 10);
  const next = Number.isFinite(parsed) ? clamp(parsed) : props.min;
  inputValue.value = String(next);
  emit('update:modelValue', next);
}

function decrement() {
  if (props.disabled) return;
  const next = clamp(props.modelValue - 1);
  emit('update:modelValue', next);
  inputValue.value = String(next);
}

function increment() {
  if (props.disabled) return;
  const next = clamp(props.modelValue + 1);
  emit('update:modelValue', next);
  inputValue.value = String(next);
}
</script>

<template>
  <div
    class="flex h-11 w-full items-center justify-between overflow-hidden rounded bg-[#f3f5f9] p-1 md:h-14"
  >
    <button
      type="button"
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-900 transition hover:bg-zinc-200/80 disabled:opacity-40 md:h-10 md:w-10"
      :disabled="disabled || modelValue <= min"
      aria-label="Azalt"
      @click="decrement"
    >
      <span class="text-xl leading-none">−</span>
    </button>
    <input
      v-model="inputValue"
      type="text"
      inputmode="numeric"
      class="w-12 shrink-0 border-none bg-transparent text-center text-base font-semibold text-zinc-900 outline-none md:w-20 md:text-[17px] xl:w-28"
      :disabled="disabled"
      @blur="commitFromInput"
      @keydown.enter.prevent="commitFromInput"
    />
    <button
      type="button"
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-900 transition hover:bg-zinc-200/80 disabled:opacity-40 md:h-10 md:w-10"
      :disabled="disabled"
      aria-label="Artır"
      @click="increment"
    >
      <span class="text-xl leading-none">+</span>
    </button>
  </div>
</template>
