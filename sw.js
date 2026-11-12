const CACHE = 'luma-drift-bbd31bfb73a9d31ccf56ebd5';
// version_sw.py reads this list and stamps CACHE from the hosted file contents.
const ASSETS = [
  "./", "./index.html", "./style.css", "./polish.css", "./game.js",
  "./assets/drift-world.svg", "./assets/relic-bloom.svg", "./assets/relic-pearl.svg",
  "./assets/relic-kite.svg", "./assets/relic-lantern.svg", "./assets/relic-key.svg",
  "./assets/relic-crown.svg", "./manifest.webmanifest", "./icon.svg"
];

self.addEventListener('install', event => {
  const requests = ASSETS.map(path => new Request(path, {cache: 'reload'}));
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(requests)));
});

// The normal waiting phase lets existing game sessions finish on their release.
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('luma-drift-') && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(request) || fetch(request);
  })());
});
