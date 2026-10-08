const CACHE_NAME="expense-calendar-v27-production-1";
const APP_SHELL=["./","./index.html","./manifest.json","./icon.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const u=new URL(event.request.url);if(u.origin!==location.origin)return;if(event.request.mode==="navigate"){event.respondWith(fetch(event.request).then(r=>{const c=r.clone();caches.open(CACHE_NAME).then(x=>x.put("./index.html",c)).catch(()=>{});return r}).catch(()=>caches.match("./index.html")));}else{event.respondWith(caches.match(event.request).then(r=>r||fetch(event.request)))}});
