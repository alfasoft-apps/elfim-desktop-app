/** BRISK kataloqu — `catalogue_cars_en.json` əsasında. */

export type BriskRoot = Record<string, unknown>;

export function getBriskBrands(root: BriskRoot): string[] {
  return Object.keys(root).sort((a, b) => a.localeCompare(b, 'az'));
}

export function getBriskModelRanges(root: BriskRoot, brand: string): string[] {
  const b = root[brand];
  if (!b || typeof b !== 'object' || Array.isArray(b)) return [];
  return Object.keys(b as Record<string, unknown>).sort((a, x) => a.localeCompare(x, 'az'));
}

export function getBriskModels(root: BriskRoot, brand: string, modelRange: string): string[] {
  const b = root[brand] as Record<string, unknown> | undefined;
  if (!b) return [];
  const mr = b[modelRange];
  if (!mr || typeof mr !== 'object' || Array.isArray(mr)) return [];
  return Object.keys(mr as Record<string, unknown>).sort((a, x) => a.localeCompare(x, 'az'));
}

export function getBriskVolumes(root: BriskRoot, brand: string, modelRange: string, model: string): string[] {
  const b = root[brand] as Record<string, unknown> | undefined;
  if (!b) return [];
  const mr = b[modelRange] as Record<string, unknown> | undefined;
  if (!mr) return [];
  const md = mr[model];
  if (!md || typeof md !== 'object' || Array.isArray(md)) return [];
  return Object.keys(md as Record<string, unknown>).sort((a, x) => a.localeCompare(x, 'az'));
}

function parseLeafCode(item: unknown): string | null {
  if (typeof item === 'string') {
    const t = item.trim();
    return t.length ? t : null;
  }
  if (typeof item === 'number' && Number.isFinite(item)) return String(item);
  return null;
}

export function getBriskCodes(
  root: BriskRoot,
  brand: string,
  modelRange: string,
  model: string,
  volume: string,
): string[] | null {
  const b = root[brand] as Record<string, unknown> | undefined;
  if (!b) return null;
  const mr = b[modelRange] as Record<string, unknown> | undefined;
  if (!mr) return null;
  const md = mr[model] as Record<string, unknown> | undefined;
  if (!md) return null;
  const vol = md[volume];
  if (!Array.isArray(vol)) return null;
  const codes: string[] = [];
  for (const item of vol) {
    const c = parseLeafCode(item);
    if (c) codes.push(c);
  }
  return codes.length ? codes : null;
}
