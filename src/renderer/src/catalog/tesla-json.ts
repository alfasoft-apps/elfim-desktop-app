/** Tesla/Babin kataloqu — `tesla.json` əsasında. */

import type { TeslaCarSpec } from '../api/types';

export type TeslaRoot = Record<string, unknown>;

export function getTeslaMakes(root: TeslaRoot): string[] {
  return Object.keys(root).sort((a, b) => a.localeCompare(b, 'az'));
}

export function getTeslaModels(root: TeslaRoot, make: string): string[] {
  const mk = root[make];
  if (!mk || typeof mk !== 'object' || Array.isArray(mk)) return [];
  return Object.keys(mk as Record<string, unknown>).sort((a, x) => a.localeCompare(x, 'az'));
}

function readStr(el: Record<string, unknown>, key: string): string {
  const v = el[key];
  return typeof v === 'string' ? v : '';
}

function buildLabel(el: Record<string, unknown>): string {
  const engine = readStr(el, 'engine');
  const ccm = readStr(el, 'ccm');
  const kw = readStr(el, 'kw');
  const yf = readStr(el, 'year_from');
  const yt = readStr(el, 'year_to');
  const motor = readStr(el, 'motor');
  return `${engine} (${ccm}ccm ${kw}kW) ${yf} - ${yt} motor ${motor}`;
}

export function getTeslaEngines(root: TeslaRoot, make: string, model: string): TeslaCarSpec[] {
  const mk = root[make] as Record<string, unknown> | undefined;
  if (!mk) return [];
  const md = mk[model];
  if (!Array.isArray(md)) return [];

  const list: TeslaCarSpec[] = [];
  for (const raw of md) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const el = raw as Record<string, unknown>;
    const coil =
      typeof el.coil === 'string'
        ? el.coil
        : typeof el.coil === 'number'
          ? String(el.coil)
          : '';
    let subcoil: string | null = null;
    if (typeof el.subcoil === 'string') subcoil = el.subcoil;
    list.push({
      coil,
      subcoil,
      displayLabel: buildLabel(el),
    });
  }
  return list;
}

export function teslaCodesCsv(spec: TeslaCarSpec): string {
  return spec.subcoil?.trim() ? `${spec.coil},${spec.subcoil}` : spec.coil;
}
