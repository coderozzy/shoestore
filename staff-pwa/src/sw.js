import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// M-2: authenticated API responses must never be cached on a shared device.
// The previous NetworkFirst+api-cache could serve staff-A data to staff-B on
// the same tablet after a session change. `NetworkOnly` is the safe default;
// if a specific GET needs offline caching in the future, key the cache on
// the user id explicitly.
registerRoute(
    ({ url }) => url.pathname.startsWith('/api'),
    new NetworkOnly(),
    'GET'
);

// Belt-and-braces: drop the legacy api-cache on activation so previously
// installed PWA clients evict their stale authenticated responses.
self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names
                .filter((n) => n === 'api-cache' || n.startsWith('api-'))
                .map((n) => caches.delete(n))
        );
    })());
});

// Allow the page to ask the SW to clear caches on logout.
self.addEventListener('message', (event) => {
    if (event.data?.type === 'clear-api-cache') {
        caches.keys().then((names) => {
            names
                .filter((n) => n === 'api-cache' || n.startsWith('api-'))
                .forEach((n) => caches.delete(n));
        });
    }
});
