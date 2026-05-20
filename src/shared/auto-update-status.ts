/** Main → renderer via `webContents.send` — avtomatik yeniləmə vəziyyəti. */
export type AutoUpdateStatus =
  | { phase: 'checking' }
  | { phase: 'not-available' }
  | { phase: 'available'; version: string }
  | { phase: 'downloading'; percent: number; transferred?: number; total?: number }
  | { phase: 'downloaded'; version: string }
  | { phase: 'error'; message: string };
