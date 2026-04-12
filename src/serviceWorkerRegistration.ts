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

    // Register FCM service worker for background push notifications
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .catch(err => console.error('FCM SW registration failed:', err));

    // Listen for NEW_VERSION broadcast from the service worker activate handler
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NEW_VERSION') {
        window.dispatchEvent(new CustomEvent('fcl:new-version'));
      }
    });
  });
}
