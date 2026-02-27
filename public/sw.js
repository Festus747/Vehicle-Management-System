// Service Worker for Vehicle Mileage Tracker PWA
const CACHE_NAME = 'vmt-cache-v11';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/ghana-gas-logo.png',
    '/css/style.css',
    '/css/themes.css',
    '/css/dashboard.css',
    '/css/vehicles.css',
    '/css/modals.css',
    '/css/responsive.css',
    '/js/api.js',
    '/js/data.js',
    '/js/auth.js',
    '/js/vehicles.js',
    '/js/mileage.js',
    '/js/alerts.js',
    '/js/reports.js',
    '/js/dashboard.js',
    '/js/import.js',
    '/js/ui.js',
    '/js/app.js'
];

const CDN_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            // Cache CDN assets separately (may fail due to CORS)
            CDN_ASSETS.forEach(url => {
                cache.add(url).catch(() => console.log('[SW] Could not cache CDN:', url));
            });
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => {
                    console.log('[SW] Removing old cache:', key);
                    return caches.delete(key);
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch - network first for API, cache first for static
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // API calls: Network first, fallback to cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache GET API responses
                    if (request.method === 'GET' && response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached response if available
                    return caches.match(request).then(cachedResponse => {
                        if (cachedResponse) return cachedResponse;
                        return new Response(JSON.stringify({ error: 'Offline' }), {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    });
                })
        );
        return;
    }

    // Static assets: Cache first, fallback to network
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
                // Fetch in background to update cache
                fetch(request).then(networkResponse => {
                    if (networkResponse && networkResponse.ok) {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, networkResponse);
                        });
                    }
                }).catch(() => {});
                return cachedResponse;
            }
            return fetch(request).then(networkResponse => {
                if (networkResponse && networkResponse.ok) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseClone);
                    });
                }
                return networkResponse;
            });
        })
    );
});

// Background sync for offline mutations
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncPendingRequests());
    }
});

async function syncPendingRequests() {
    // This will be triggered when the app comes back online
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({ type: 'SYNC_COMPLETE' });
    });
}
