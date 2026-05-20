<script setup lang="ts">
import { computed, ref, watch } from 'vue';

export type TableColumn = {
  key: string;
  label: string;
  format?: (row: Record<string, unknown>) => string;
};

const props = withDefaults(
  defineProps<{
    columns: TableColumn[];
    rows: Record<string, unknown>[];
    rowKey?: string;
    minVisible?: number;
  }>(),
  {
    rowKey: 'id',
    minVisible: 5,
  },
);

const expanded = ref(false);

watch(
  () => props.rows,
  () => {
    expanded.value = false;
  },
);

const total = computed(() => props.rows.length);
const visibleRows = computed(() => {
  if (expanded.value || total.value <= props.minVisible) return props.rows;
  return props.rows.slice(0, props.minVisible);
});

const hiddenCount = computed(() => Math.max(0, total.value - props.minVisible));
const showMoreButton = computed(() => !expanded.value && hiddenCount.value > 0);
const showLessButton = computed(() => expanded.value && total.value > props.minVisible);

function cellText(row: Record<string, unknown>, col: TableColumn): string {
  if (col.format) return col.format(row);
  const v = row[col.key];
  return v == null || v === '' ? '—' : String(v);
}

function rowId(row: Record<string, unknown>, idx: number): string {
  const raw = row[props.rowKey];
  if (raw != null && raw !== '') return String(raw);
  return String(idx);
}
</script>

<template>
  <div>
    <div class="overflow-x-auto">
      <table class="min-w-full table-auto border-collapse border border-zinc-200">
        <thead class="bg-zinc-100">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              class="border border-zinc-200 px-4 py-2 text-left text-sm font-semibold text-zinc-700"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in visibleRows" :key="rowId(row, idx)" class="even:bg-zinc-50">
            <td
              v-for="col in columns"
              :key="col.key"
              class="border border-zinc-200 px-4 py-2 text-sm text-zinc-800"
            >
              {{ cellText(row, col) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showMoreButton || showLessButton" class="mt-3 flex justify-center">
      <button
        v-if="showMoreButton"
        type="button"
        class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
        @click="expanded = true"
      >
        Daha çox göstər
        <span class="text-emerald-600/80">({{ hiddenCount }} əlavə)</span>
      </button>
      <button
        v-else-if="showLessButton"
        type="button"
        class="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        @click="expanded = false"
      >
        Daha az göstər
      </button>
    </div>
  </div>
</template>
