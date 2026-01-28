const CACHE_NAME = 'sonus-v2';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './logo.png',
    './manifest.json',
    'https://unpkg.com/lucide@latest',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((fetchRes) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    // Only cache same-origin or specific CDN requests
                    if (event.request.url.includes('itunes.apple.com')) return fetchRes;
                    cache.put(event.request, fetchRes.clone());
                    return fetchRes;
                });
            });
        }).catch(() => {
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        })
    );
});
