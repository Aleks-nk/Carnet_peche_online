const CACHE_NAME = "carnet-peche-v21";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Installation : on met en cache tout ce qu'il faut pour tourner hors-ligne.
// IMPORTANT : on force le contournement du cache HTTP du navigateur (cache: "reload"),
// sinon cache.addAll() peut récupérer une copie périmée d'index.html depuis le cache
// disque du téléphone au lieu d'aller chercher la vraie dernière version sur le réseau.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(ASSETS.map(async (url) => {
        const request = new Request(url, { cache: "reload" });
        const response = await fetch(request);
        await cache.put(url, response);
      }));
    })
  );
  self.skipWaiting();
});

// Activation : on nettoie les anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Stratégie : cache d'abord, réseau en secours (utile pour les polices Google la première fois)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
