const CACHE_NAME = "jflx-offline-v1"
const OFFLINE_URL = "/offline.html"

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("jflx-offline-") && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET") return
  event.respondWith(fetch(event.request).catch(async () => {
    const cache = await caches.open(CACHE_NAME)
    return (await cache.match(OFFLINE_URL)) || new Response("Contenu indisponible hors ligne", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
  }))
})
