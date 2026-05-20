import type { DesktopBundleNotification } from '../types/app-data-cache';

const STORAGE_KEY = 'elfim_seen_notification_ids_v1';

/** Keş sinxronundan sonra yeni bildirişlər üçün Windows/macOS sistem bildirişi (Electron renderer Notification API). */
export function processNewNotificationsFromBundle(
  items: DesktopBundleNotification[] | undefined | null,
): void {
  if (!items?.length) return;

  const idsFromPayload = items.map((x) => x.id).filter(Boolean);
  const baselineRaw = localStorage.getItem(STORAGE_KEY);

  if (baselineRaw == null) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(idsFromPayload));
    return;
  }

  let seen: string[];
  try {
    seen = JSON.parse(baselineRaw) as string[];
    if (!Array.isArray(seen)) seen = [];
  } catch {
    seen = [];
  }

  const seenSet = new Set(seen);
  for (const item of items) {
    if (!item.id || seenSet.has(item.id)) continue;
    const title = item.data?.title?.trim() || 'Elfim Auto';
    const body = (item.data?.desc ?? '').trim() || 'Yeni bildiriş.';
    showOsToast(title, body);
    seenSet.add(item.id);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify([...seenSet]));
}

function showOsToast(title: string, body: string): void {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
  const safeBody = body.length > 280 ? `${body.slice(0, 277)}…` : body;
  try {
    if (Notification.permission === 'granted') {
      new Notification(title, { body: safeBody });
      return;
    }
    if (Notification.permission === 'default') {
      void Notification.requestPermission().then((p) => {
        if (p === 'granted') new Notification(title, { body: safeBody });
      });
    }
  } catch {
    /* sessiz — brauzer/OS məhdudiyyəti */
  }
}
