/** AppShell `<main ref="mainScroll">` — məzmun burada scroll olunur. */
export const APP_MAIN_SCROLL_ID = 'elfim-main-scroll';

export function scrollAppMainToTop(behavior: ScrollBehavior = 'smooth'): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(APP_MAIN_SCROLL_ID);
  if (el) {
    el.scrollTo({ top: 0, left: 0, behavior });
    return;
  }
  window.scrollTo({ top: 0, left: 0, behavior });
}

/** Siyahı DOM-da yeniləndikdən sonra (pagination və s.) — iki frame gözləyir. */
export function scrollAppMainToTopAfterPaint(behavior: ScrollBehavior = 'instant'): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollAppMainToTop(behavior);
    });
  });
}
