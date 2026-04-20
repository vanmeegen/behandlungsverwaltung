export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  window.addEventListener(
    'load',
    () => {
      if (!('serviceWorker' in navigator)) return;
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    },
    { once: true },
  );
}
