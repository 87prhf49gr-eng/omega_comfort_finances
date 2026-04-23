/* Comfort Ledger — service worker (caché PWA + clic en notificaciones) */
const CACHE_NAME = "comfort-ledger-v31";
const APP_SHELL = "./COMFORT-LEDGER-abrir-aqui.html";
const PRECACHE = [
  APP_SHELL,
  "./comfort-ledger-core.js",
  "./comfort-ledger-onboarding.js",
  "./comfort-ledger-reminders.js",
  "./comfort-ledger-notifications.js",
  "./comfort-ledger-modules.js",
  "./comfort-ledger-ui.js",
  "./comfort-ledger-post-dash.js",
  "./comfort-ledger-coach.js",
  "./comfort-ledger-bindings.js",
  "./comfort-ledger-pwa.js",
  "./comfort-ledger.webmanifest",
  "./branding/comfort-ledger-nav-icon.png",
  "./pwa-icons/icon-192.png",
  "./pwa-icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try {
      data = { title: event.data && event.data.text() };
    } catch {
      data = {};
    }
  }
  const title = String(data.title || "Comfort Ledger");
  const body = String(data.body || "");
  const url = String(data.url || "/app");
  const tag = String(data.tag || "comfort-reminder");
  const options = {
    body,
    tag,
    data: { url },
    icon: "./pwa-icons/icon-192.png",
    badge: "./pwa-icons/icon-192.png",
    renotify: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of clientsList) {
          client.postMessage({ type: "push-subscription-change" });
        }
      } catch {
        /* ignore */
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  if (!url || !clients.openWindow) return;
  event.waitUntil(
    (async () => {
      let target;
      try {
        target = new URL(url, self.location.href);
      } catch {
        return clients.openWindow(url);
      }
      const ext = target.origin !== self.location.origin;
      if (ext) {
        return clients.openWindow(url);
      }
      const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windowClients) {
        if ("navigate" in client && typeof client.navigate === "function") {
          try {
            await client.navigate(url);
            if ("focus" in client) return client.focus();
            return undefined;
          } catch {
            /* fall through */
          }
        }
        if ("focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(APP_SHELL, { ignoreSearch: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
