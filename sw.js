/* Expense Calendar service worker - v10.11
 * - App pages: network first (newest GitHub Pages version), cache when offline
 * - Local assets and the Supabase library: stale-while-revalidate
 * - Supabase API calls and other origins: always network, never cached
 */

const CACHE_NAME = "expense-calendar-v10-11";
const APP_SHELL = ["./", "./index.html", "./manifest.json"];
const NAV_TIMEOUT_MS = 4000;

/* Third-party scripts the app cannot start without. */
const CDN_ALLOWED = [
    { host: "cdn.jsdelivr.net", prefix: "/npm/@supabase/" }
];

const isCdnAsset = url =>
    CDN_ALLOWED.some(c => url.hostname === c.host && url.pathname.startsWith(c.prefix));

/* Only cache complete, successful responses (or opaque script loads from the CDN). */
const cacheable = (response, allowOpaque) =>
    response && (response.ok || (allowOpaque && response.type === "opaque"));

const OFFLINE_PAGE = new Response(
    "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
    "<title>Offline</title><body style='font-family:system-ui;text-align:center;padding:48px'>" +
    "<h2>You are offline</h2><p>Open the app once while online to enable offline use.</p></body>",
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
);

/* ---------- INSTALL: cache each file on its own so one missing file cannot block install ---------- */
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => Promise.allSettled(APP_SHELL.map(url => cache.add(url))))
            .then(() => self.skipWaiting())
    );
});

/* ---------- ACTIVATE: remove old caches ---------- */
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

/* ---------- helpers ---------- */
function networkFirstPage(request) {
    const network = fetch(request).then(response => {
        if (cacheable(response, false)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(c => c.put("./index.html", copy)).catch(() => {});
        }
        return response;
    });

    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NAV_TIMEOUT_MS));

    return Promise.race([network, timeout])
        .catch(() =>
            caches.match("./index.html")
                .then(cached => cached || caches.match("./"))
                .then(cached => cached || network.catch(() => OFFLINE_PAGE.clone()))
        );
}

function staleWhileRevalidate(request, allowOpaque) {
    return caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
            const refresh = fetch(request)
                .then(response => {
                    if (cacheable(response, allowOpaque)) cache.put(request, response.clone()).catch(() => {});
                    return response;
                })
                .catch(() => cached);
            return cached || refresh;
        })
    );
}

/* ---------- FETCH ---------- */
self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    if (url.origin === self.location.origin) {
        event.respondWith(
            request.mode === "navigate"
                ? networkFirstPage(request)
                : staleWhileRevalidate(request, false)
        );
        return;
    }

    if (isCdnAsset(url)) {
        event.respondWith(staleWhileRevalidate(request, true));
    }
    /* everything else (Supabase API, other CDNs) goes straight to the network */
});
