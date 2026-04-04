/**
 * Registers the service worker for PWA offline support.
 * Only runs in production to avoid caching issues during development.
 */
export function register(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(err => console.error('SW registration failed:', err));
  });
}
