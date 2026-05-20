/**
 * Electron `ipcRenderer.invoke` structured clone üçün təmiz JSON.
 * Vue/Pinia proxy və ya fetch header qalıqları "An object could not be cloned" verir.
 */
export function toIpcCloneable<T>(value: T): T {
  if (value === undefined) return value;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}
