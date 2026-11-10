const CACHE='luma-drift-v15';
const ASSETS=['./','./index.html','./style.css','./polish.css','./assets/drift-world.svg','./assets/relic-bloom.svg','./assets/relic-pearl.svg','./assets/relic-kite.svg','./assets/relic-lantern.svg','./assets/relic-key.svg','./assets/relic-crown.svg','./game.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('luma-drift-') && k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return; e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
