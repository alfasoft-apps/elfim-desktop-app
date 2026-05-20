/** POS və məhsul kartlarında eyni qiymət formatı. */
export function formatMoneyAzn(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (Number.isNaN(n)) return null;
  const num = new Intl.NumberFormat('az-AZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `AZN ${num}`;
}
