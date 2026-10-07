const CACHE_NAME = "expense-calendar-v10-4";

const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.json"
];

/* =========================
   INSTALL
========================= */

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});


/* =========================
   ACTIVATE
========================= */

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


/* =========================
   FETCH
========================= */

self.addEventListener("fetch", event => {

    if (event.request.method !== "GET") {
        return;
    }

    const url = new URL(event.request.url);

    /*
     * External resources such as Supabase
     * and CDN files remain network-only.
     */
    if (url.origin !== self.location.origin) {
        return;
    }


    /*
     * Main page:
     * Always try the network first so the
     * latest GitHub Pages version is loaded.
     *
     * If offline, use cached index.html.
     */
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


    /*
     * Other local resources:
     * Cache first, then network.
     */
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
