/** Renderer güzgüsü — `src/shared/ipc-serialize.ts` ilə eyni. */
export function toIpcCloneable<T>(value: T): T {
  if (value === undefined) return value;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}
