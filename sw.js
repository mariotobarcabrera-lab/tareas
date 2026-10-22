const CACHE = "tareas-v4"; // cambia el número al publicar una versión nueva
const BASE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
    e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))
        .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
    const u = new URL(e.request.url);
    if (e.request.method !== "GET") return;
    if (u.origin !== location.origin && u.hostname !== "www.gstatic.com") return; // API de Firebase: sin caché
    e.respondWith(caches.open(CACHE).then(async c => {
        const hit = await c.match(e.request);
        const red = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })
            .catch(() => hit || (e.request.mode === "navigate" ? c.match("./index.html") : undefined));
        return hit || red;
    }));
});

/* Clic en la notificación (o "Abrir app") = abrir la app. "Posponer" y "Marcar como realizada" = acciones sobre la tarea */
self.addEventListener("notificationclick", e => {
    const d = e.notification.data || {};
    const accion = e.action || "abrir";
    e.notification.close();
    e.waitUntil((async () => {
        const wins = await clients.matchAll({type: "window", includeUncontrolled: true});
        for (const c of wins) {
            if (c.url.startsWith(self.registration.scope)) {
                await c.focus();
                if (accion !== "abrir") c.postMessage({tipo: "accion", accion, id: d.id});
                return;
            }
        }
        const url = accion === "abrir" ? self.registration.scope
            : new URL("./?accion=" + accion + "&tarea=" + encodeURIComponent(d.id), self.registration.scope).href;
        await clients.openWindow(url);
    })());
});
