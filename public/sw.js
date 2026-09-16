/*
 * NuMind service worker — hand-written, no build step, no Workbox.
 *
 * It is served from `public/sw.js`, so its scope is the whole origin. The
 * strategy list is deliberately conservative:
 *
 *   /assets/*        hashed by Vite and immutable -> cache first
 *   public pages     marketing HTML only          -> network first + offline fallback
 *   images           icons and avatars            -> stale while revalidate
 *   everything else  app shell, auth, server fns  -> untouched (network only)
 *
 * Authenticated HTML (/app/*, /admin, the auth flows) is never cached: it would
 * leak one account's page to the next person on a shared device and would keep
 * serving stale signed-in state. Bump VERSION to invalidate every cache.
 */

const VERSION = "v1";
const STATIC_CACHE = `numind-static-${VERSION}`;
const PAGE_CACHE = `numind-pages-${VERSION}`;

const OFFLINE_URL = "/offline.html";
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

/* Marketing pages that are safe to keep offline. Nothing auth-gated belongs here. */
const PUBLIC_PAGES = ["/", "/features", "/pricing", "/about", "/faq", "/privacy", "/terms"];

const NEVER_CACHE = [
  /^\/app(\/|$)/,
  /^\/admin/,
  /^\/(login|signup|onboarding|forgot-password|reset-password)/,
  /^\/_serverFn/,
  /^\/api\//,
];

const IMAGE_PATTERN = /\.(png|jpe?g|webp|avif|gif|svg|ico)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Individually, so a single failure cannot abort the whole install.
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch {
            /* non fatal: the asset is fetched on demand instead */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((pattern) => pattern.test(url.pathname))) return;

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    // Unknown routes stay network only, so we never serve the wrong shell offline.
    if (!PUBLIC_PAGES.includes(url.pathname)) return;
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (IMAGE_PATTERN.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") await cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const home = await caches.match("/");
    if (home) return home;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const revalidated = fetch(request)
    .then(async (response) => {
      if (response.ok && response.type === "basic") await cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  if (cached) return cached;
  return (await revalidated) ?? Response.error();
}
