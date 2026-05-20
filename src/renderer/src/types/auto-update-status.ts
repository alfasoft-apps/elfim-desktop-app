/** Mirror `src/shared/auto-update-status.ts` — renderer `tsconfig.web` `shared`-i birbaşa kompilyasiya etmir (TS6305). */
export type AutoUpdateStatus =
  | { phase: 'checking' }
  | { phase: 'not-available' }
  | { phase: 'available'; version: string }
  | { phase: 'downloading'; percent: number; transferred?: number; total?: number }
  | { phase: 'downloaded'; version: string }
  | { phase: 'error'; message: string };
