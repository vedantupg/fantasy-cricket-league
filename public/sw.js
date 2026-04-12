const CACHE = 'fcl-v1';
const SHELL = ['/', '/index.html'];

let isNewInstall = false;

self.addEventListener('install', e => {
  isNewInstall = true;
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => {
      // Only notify clients when the SW itself was updated, not on every page reload
      if (isNewInstall) {
        isNewInstall = false;
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage({ type: 'NEW_VERSION' }));
        });
      }
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')));
  }
});
