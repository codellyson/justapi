// JustAPI service worker.
//
// Intentionally minimal: this SW exists only so the app is installable as a
// PWA on platforms (Chrome / Android) that require a registered worker for
// the install prompt. It does NOT cache anything — every request falls
// through to the network. The previous PWA's aggressive cache-first
// strategy caused stale-content bugs; we deliberately keep this one inert.

self.addEventListener('install', () => {
  // Activate immediately so a freshly-installed SW takes over without
  // requiring a second navigation.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Take control of any open clients straight away.
      await self.clients.claim();
      // Purge ALL existing Cache Storage entries. Anything left by the
      // previous PWA's cache-first strategy gets dropped here.
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    })()
  );
});

// No fetch listener on purpose. Without one, the browser handles requests
// itself — no cache, no service-worker hops — and Chrome still treats the
// app as a PWA because a worker is registered.
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
