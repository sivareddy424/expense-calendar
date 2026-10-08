const CACHE_NAME = "expense-calendar-v11-production-1";

const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.json"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys =>
                Promise.all(
                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);

    // Only handle requests from this GitHub Pages site
    if (url.origin !== self.location.origin) return;

    // For page navigation:
    // Always try the newest online version first.
    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const copy = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put("./index.html", copy);
                        })
                        .catch(() => {});

                    return response;
                })
                .catch(() => {
                    return caches.match("./index.html");
                })
        );

        return;
    }

    // For other local files:
    // Cache first, then download and cache if not available.
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then(response => {
                        const copy = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, copy);
                            })
                            .catch(() => {});

                        return response;
                    });
            })
    );
});
