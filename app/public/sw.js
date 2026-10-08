/**
 * Common Hearth service worker.
 *
 * Exists so Chrome treats the app as installable: `beforeinstallprompt` only fires
 * once a service worker with a fetch handler controls the page. Nothing is cached,
 * ever. Care notes are private to a circle, so there is no offline copy worth
 * keeping -- every request is passed straight through to the network, which leaves
 * the HTTP cache and the browser's normal request handling exactly as they were.
 */

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Plain same-origin GETs only. Everything else is left to the browser.
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  // Passthrough, not caching. A failure propagates as a real network error
  // instead of being answered with a stale response.
  event.respondWith(fetch(event.request));
});