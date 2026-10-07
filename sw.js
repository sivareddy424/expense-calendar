const CACHE_NAME = "expense-calendar-v10";

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
            .then(keys => {

                return Promise.all(

                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key))

                );

            })
            .then(() => self.clients.claim())

    );

});


/* =========================
   FETCH
========================= */

self.addEventListener("fetch", event => {

    /*
     * Only handle GET requests.
     */
    if (event.request.method !== "GET") {
        return;
    }

    const url = new URL(event.request.url);


    /*
     * External resources such as:
     * Supabase
     * jsDelivr
     * other CDNs
     *
     * remain network-only.
     */
    if (url.origin !== self.location.origin) {
        return;
    }


    /* =========================
       PAGE NAVIGATION
       =========================

       Network first:
       always try to load the
       newest GitHub Pages version.

       If offline, use cache.
    */

    if (event.request.mode === "navigate") {

        event.respondWith(

            fetch(event.request)

                .then(response => {

                    const copy = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {

                            cache.put(
                                "./index.html",
                                copy
                            );

                        })
                        .catch(() => {});

                    return response;

                })

                .catch(() => {

                    return caches.match(
                        "./index.html"
                    );

                })

        );

        return;
    }


    /* =========================
       OTHER LOCAL FILES
       =========================

       Cache first:
       use cached resource when
       available.

       Otherwise go to network
       and cache the result.
    */

    event.respondWith(

        caches.match(event.request)

            .then(cachedResponse => {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)

                    .then(response => {

                        const copy =
                            response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {

                                cache.put(
                                    event.request,
                                    copy
                                );

                            })
                            .catch(() => {});

                        return response;

                    });

            })

    );

});
