const CACHE_NAME = "carnet-peche-v22";

// Domaines dont les réponses ne doivent JAMAIS être mises en cache :
// ce sont des données dynamiques (prises, sorties, météo) qui doivent toujours
// être fraîches. Les mettre en cache a provoqué un bug où les nouvelles prises
// n'apparaissaient plus tant que le cache n'était pas vidé manuellement.
const NEVER_CACHE_HOSTS = [
  "supabase.co",
  "open-meteo.com"
];
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
// SAUF pour Supabase/Open-Meteo, toujours interrogés directement en réseau (jamais de cache).
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isNeverCache = NEVER_CACHE_HOSTS.some(host => url.hostname.endsWith(host));

  if(isNeverCache){
    event.respondWith(fetch(event.request));
    return;
  }

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
